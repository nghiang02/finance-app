# Kiến trúc

## Tổng quan

```
[Mobile – Expo]  ─┐
                   ├──  REST /api/v1 (JSON, JWT)  ──>  [Backend – NestJS]  ──>  [PostgreSQL]
[Web – Next.js]  ─┘
        ▲
        └── dùng chung @finance/shared (Zod schema, type, format tiền/ngày)
            và @finance/api-client (hàm gọi API + hook TanStack Query)
```

- Backend là nguồn dữ liệu duy nhất (single source of truth).
- Client cache dữ liệu bằng TanStack Query; sau mỗi thay đổi thì invalidate query liên quan.
- Đồng bộ giai đoạn MVP: client luôn gọi API, refetch khi mở app hoặc quay lại màn hình. Giai đoạn offline: dùng endpoint `GET /sync?since=<timestamp>` trả các bản ghi có `updatedAt > since` (gồm bản đã xóa mềm).

## Data model (Prisma, rút gọn)

```prisma
enum CategoryType   { INCOME EXPENSE }
enum TransactionType { INCOME EXPENSE TRANSFER }
enum WalletType     { CASH BANK CREDIT_CARD E_WALLET OTHER }

model User {
  id           String   @id @default(uuid())
  email        String   @unique
  passwordHash String
  name         String?
  currency     String   @default("VND")
  timezone     String   @default("Asia/Ho_Chi_Minh")
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  wallets      Wallet[]
  categories   Category[]
  transactions Transaction[]
  budgets      Budget[]
  refreshTokens RefreshToken[]
}

model Wallet {
  id             String     @id @default(uuid())
  userId         String
  name           String
  type           WalletType
  currency       String     @default("VND")
  initialBalance BigInt     @default(0)
  archived       Boolean    @default(false)
  createdAt      DateTime   @default(now())
  updatedAt      DateTime   @updatedAt
  deletedAt      DateTime?
  user           User       @relation(fields: [userId], references: [id])
  @@index([userId])
}

model Category {
  id        String       @id @default(uuid())
  userId    String
  name      String
  type      CategoryType
  icon      String?
  color     String?
  parentId  String?
  parent    Category?    @relation("CategoryTree", fields: [parentId], references: [id])
  children  Category[]   @relation("CategoryTree")
  createdAt DateTime     @default(now())
  updatedAt DateTime     @updatedAt
  deletedAt DateTime?
  user      User         @relation(fields: [userId], references: [id])
  @@index([userId])
}

model Transaction {
  id           String          @id @default(uuid())
  userId       String
  type         TransactionType
  amount       BigInt          // luôn > 0, đơn vị nhỏ nhất của tiền tệ
  walletId     String
  toWalletId   String?         // chỉ dùng cho TRANSFER
  categoryId   String?         // null với TRANSFER
  note         String?
  occurredAt   DateTime        // thời điểm giao dịch (UTC)
  createdAt    DateTime        @default(now())
  updatedAt    DateTime        @updatedAt
  deletedAt    DateTime?
  user         User            @relation(fields: [userId], references: [id])
  @@index([userId, occurredAt])
  @@index([userId, categoryId])
}

model Budget {
  id         String    @id @default(uuid())
  userId     String
  categoryId String?   // null = ngân sách tổng
  month      String    // "YYYY-MM"
  limit      BigInt
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt
  deletedAt  DateTime?
  user       User      @relation(fields: [userId], references: [id])
  @@unique([userId, categoryId, month])
}

model RefreshToken {
  id        String   @id @default(uuid())
  userId    String
  tokenHash String
  expiresAt DateTime
  revokedAt DateTime?
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id])
}
```

Ghi chú: JSON không chứa được `BigInt`, nên API trả số tiền dạng `number` (đủ an toàn với VND cá nhân, < 2^53) hoặc `string` nếu sau này cần. Quy ước chuyển đổi đặt ở một chỗ trong backend.

### Quyết định khi triển khai schema (Giai đoạn 0)

Nguồn chuẩn là `apps/backend/prisma/schema.prisma`. Khác với bản rút gọn ở trên:

- Dùng **Prisma ORM 7** (ghim `^7`). Prisma 8 còn là release candidate, API khác hẳn.
- Thêm quan hệ khóa ngoại cho `Transaction.walletId/toWalletId/categoryId` và `Budget.categoryId`. Dùng `onDelete: NoAction` để chặn xóa cứng ví/danh mục đang được tham chiếu (ta chỉ xóa mềm), `Cascade` khi xóa `User`.
- Mọi cột thời gian là `timestamptz`, để `AT TIME ZONE 'Asia/Ho_Chi_Minh'` trong SQL báo cáo tính đúng tháng.
- `Budget`: thay `@@unique([userId, categoryId, month])` bằng hai unique index một phần (`WHERE "deletedAt" IS NULL`), vì PostgreSQL coi các NULL là khác nhau (ngân sách tổng có `categoryId = null`) và bản ghi đã xóa mềm không được chặn việc tạo lại.
- `RefreshToken.tokenHash` là `@unique`, thêm index `userId`.
- CHECK constraint trong migration `init`: `amount > 0`, `limit > 0`, định dạng `month`, và hình dạng giao dịch (TRANSFER có `toWalletId` khác `walletId` và không có `categoryId`; INCOME/EXPENSE có `categoryId` và không có `toWalletId`).

### Quyết định khi dựng backend (Giai đoạn 0)

- **NestJS 12, ES module** (`"type": "module"`, import tương đối có đuôi `.js`). Prisma Client sinh ở dạng ESM (`moduleFormat = "esm"`).
- **Validation**: dùng `StandardSchemaValidationPipe` có sẵn của NestJS 12, đăng ký global. Route khai báo schema Zod từ `@finance/shared`, ví dụ `@Body({ schema: createWalletSchema })`. Lỗi trả `400 VALIDATION_ERROR` với `details.issues: [{ path, message }]`.
- **Định dạng lỗi**: schema và danh sách mã lỗi nằm ở `@finance/shared` (`apiErrorResponseSchema`, `ERROR_CODES`). `AllExceptionsFilter` là nơi duy nhất quyết định response lỗi: `ApiException` giữ nguyên mã; Prisma `P2002` → `409 CONFLICT`, `P2025` → `404 NOT_FOUND`; lỗi 5xx chỉ trả `INTERNAL_ERROR`, chi tiết ghi vào log server.
- **Biến môi trường**: kiểm tra bằng Zod lúc khởi động (`src/config/env.ts`); sai là app dừng ngay, thông báo lỗi không in giá trị.
- **Health check**: `GET /api/v1/health` chạy `SELECT 1`; database lỗi → `503 SERVICE_UNAVAILABLE`.
- **404 ngoài prefix**: từ NestJS 12, request ngoài `/api/v1` không đi qua Nest; `setupApp()` thêm handler dự phòng sau `app.init()` để vẫn trả 404 JSON đúng định dạng. Header `X-Powered-By` bị tắt.
- **Test**: Vitest (Vite 8 tự phát decorator metadata từ tsconfig). E2E test thay `PrismaService` bằng mock nên không cần database.

### Quyết định khi dựng web và mobile (Giai đoạn 0)

- **Gọi API**: cả hai app dùng `@finance/api-client` (`createApiClient` + `ApiClientProvider` + hook). Mọi response được kiểm tra bằng schema trong `@finance/shared`; mọi lỗi là `ApiError` (`status`, `code`, `details`), `NETWORK_ERROR` khi không tới được máy chủ. TanStack Query không retry lỗi 4xx (`shouldRetryRequest`).
- **Web gọi API cùng origin**: trình duyệt gọi `/api/v1/*` trên chính web (cổng 3001), `next.config.ts` rewrite sang backend (`API_PROXY_TARGET`). Không cần CORS, và khi deploy web và API khác domain, cookie refresh token (`httpOnly; SameSite=Lax`) vẫn là first-party. Chỉ cân nhắc gọi thẳng + CORS nếu web và API chung domain gốc (vd. `app.` và `api.` cùng một domain).
- **Mobile tìm backend**: `EXPO_PUBLIC_API_URL` nếu có; khi phát triển thì lấy IP máy đang chạy Metro (`Constants.expoConfig.hostUri`) + cổng 3000, để điện thoại thật cùng Wi-Fi gọi được máy tính.
- **Font web**: Inter có subset `vietnamese` để dấu tiếng Việt hiển thị cùng một font.
- **Một bản duy nhất của React và TanStack Query**: phiên bản khai báo một lần trong `catalog:` của `pnpm-workspace.yaml` (React ghim theo Expo SDK). Hai bản khác nhau = hai context → hook trong `@finance/api-client` không thấy provider của app.
- **Package dùng chung là ES module** (`"type": "module"`). Thư viện như TanStack Query có hai bản build (ESM và CJS); nếu package build ra CommonJS (`require`) còn app dùng `import`, app sẽ nạp cả hai bản và lại có hai context.
- **ESLint**: backend và các package dùng ESLint 10 + `@finance/eslint-config` (type-aware). Web và mobile dùng ESLint 9 với config chính thức (`eslint-config-next`, `eslint-config-expo`), vì `eslint-plugin-react` bên trong chưa chạy được trên ESLint 10.

## API (REST, prefix `/api/v1`)

| Nhóm      | Endpoint                                                                                                                         |
| --------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Auth      | `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /me`                                  |
| Ví        | `GET/POST /wallets`, `PATCH/DELETE /wallets/:id` (kèm số dư hiện tại)                                                            |
| Danh mục  | `GET/POST /categories`, `PATCH/DELETE /categories/:id`                                                                           |
| Giao dịch | `GET /transactions?month=YYYY-MM&walletId=&categoryId=&type=&q=&cursor=`, `POST /transactions`, `PATCH/DELETE /transactions/:id` |
| Ngân sách | `GET /budgets?month=YYYY-MM` (kèm đã dùng, còn lại, %), `POST /budgets`, `PATCH/DELETE /budgets/:id`                             |
| Báo cáo   | `GET /reports/monthly-summary?month=`, `GET /reports/by-category?month=&type=`, `GET /reports/trend?from=&to=`                   |
| Đồng bộ   | `GET /sync?since=<ISO timestamp>` (giai đoạn offline)                                                                            |

Định dạng lỗi: `{ "error": { "code": "VALIDATION_ERROR", "message": "...", "details": {...} } }`.
Phân trang danh sách giao dịch theo cursor (`occurredAt` + `id`).

## Xác thực

- Access token JWT 15 phút, refresh token 30 ngày (lưu hash trong DB, xoay vòng mỗi lần refresh).
- Mobile: lưu token trong `expo-secure-store`.
- Web: refresh token trong cookie `httpOnly; Secure; SameSite=Lax`, access token trong bộ nhớ.

### Triển khai (Giai đoạn 1)

- **Mật khẩu**: argon2id (`argon2`). Email không tồn tại vẫn chạy một lần verify giả để thời gian phản hồi không lộ email nào có tài khoản; sai email hay sai mật khẩu đều trả cùng `401 Invalid email or password`.
- **Access token**: `@nestjs/jwt`, HS256 (ghim thuật toán), payload `{ sub: userId }`, secret `JWT_ACCESS_SECRET` ≥ 32 ký tự. `AccessTokenGuard` là guard toàn cục; route công khai đánh dấu `@Public()`; lấy người dùng bằng `@CurrentUser()`.
- **Refresh token**: chuỗi ngẫu nhiên 256 bit, DB chỉ lưu SHA-256. Mỗi lần refresh, token cũ bị thu hồi và token mới cùng `familyId` được tạo trong một transaction (`updateMany ... where revokedAt IS NULL` để chỉ một request thắng khi chạy song song). Token đã thu hồi mà bị dùng lại → thu hồi cả family (phát hiện token bị đánh cắp). Hai tab web refresh cùng lúc bằng cùng cookie cũng bị coi là dùng lại: client phải gộp các lần refresh đồng thời (làm ở mục giao diện).
- **Web vs mobile**: header `x-client-type: mobile` → refresh token trong body; còn lại → cookie `finance_rt` (`httpOnly`, `SameSite=Lax`, `Path=/api/v1/auth`, `Secure` khi production). Refresh/logout trả token mới qua đúng kênh token cũ được gửi lên, nên script trong trình duyệt không đổi được cookie thành token đọc được.
- **Giới hạn tần suất**: `@nestjs/throttler`, mặc định 300 request/phút/IP; đăng ký và đăng nhập 10/phút; refresh và logout 30/phút. `TRUST_PROXY` (mặc định `loopback`) quyết định proxy nào được tin `X-Forwarded-For`. Bộ đếm nằm trong bộ nhớ: khi chạy nhiều instance cần chuyển sang Redis.
- **Test**: integration test chạy trên PostgreSQL thật (`TEST_DATABASE_URL`, tên DB phải kết thúc bằng `_test`, bị xóa sạch mỗi test); migration tự chạy trong `test/global-setup.ts`.
- **Danh mục mặc định**: `DEFAULT_CATEGORIES` trong `@finance/shared` (12 danh mục gốc, 19 tính cả con; icon là emoji để web và mobile hiển thị giống nhau). `register` tạo user → danh mục mặc định → phiên đăng nhập trong **một** `prisma.$transaction`; lỗi ở bất kỳ bước nào thì không lưu gì. Id danh mục cha sinh sẵn bằng `randomUUID()` để chèn cha và con bằng hai lệnh `createMany`.
- **Phiên đăng nhập phía client** (`@finance/api-client`): access token chỉ nằm trong bộ nhớ; `session.restore()` chạy khi app mở (web: cookie, mobile: refresh token đã lưu). Request gặp 401 thì refresh một lần rồi gửi lại; nhiều request cùng 401 dùng chung **một** lần refresh. Web đi qua `navigator.locks` để các tab refresh lần lượt (tab sau gửi cookie tab trước vừa xoay vòng). Refresh bị từ chối → phiên kết thúc. React: `useSession`, `useSignIn`, `useSignUp`, `useSignOut` (đăng xuất xóa toàn bộ cache TanStack Query).
- **Bảo vệ trang web**: `<AuthGate>` phía client. Server không biết ai đang đăng nhập khi render trang (cookie chỉ gửi tới `/api/v1/auth`, access token trong bộ nhớ), nhưng dữ liệu vẫn an toàn vì mọi API đều kiểm tra access token.
- **Mobile**: refresh token lưu bằng `expo-secure-store` (Keychain iOS / Keystore Android), không dùng AsyncStorage. Layout của từng nhóm tự kiểm tra phiên: `(app)` chuyển sang `/login` khi chưa đăng nhập, `(auth)` chuyển về `/` khi đã đăng nhập, bằng `<Redirect>` (thay màn hiện tại, nên không "back" lại app sau khi đăng xuất). Không dùng `Stack.Protected`: với URL `/` lúc mở app, nhóm `(app)` bị gỡ khỏi navigator và app báo "Unmatched Route". Splash screen giữ nguyên tới khi khôi phục phiên xong, để màn đăng nhập không nháy lên.
- **Chưa làm**: dọn refresh token hết hạn (job định kỳ), xác minh email, quên mật khẩu.

## Ví (Giai đoạn 2)

- **API**: `GET /wallets` (cả ví đã lưu trữ, kèm số dư), `POST /wallets`, `PATCH /wallets/:id`, `DELETE /wallets/:id` (xóa mềm, `204`). Id kiểm tra bằng `idSchema` (UUID) → sai định dạng là `400`.
- **Phân quyền**: mọi truy vấn có `userId` trong điều kiện; sửa/xóa dùng `updateMany({ where: { id, userId, deletedAt: null } })` để kiểm tra quyền và ghi trong một câu lệnh. Ví không tồn tại hoặc của người khác đều trả `404` (không phải `403`), để id không dùng được để dò dữ liệu người khác.
- **Số dư** = số dư ban đầu + thu − chi − chuyển đi + chuyển đến, bỏ qua giao dịch đã xóa mềm. Tính bằng `BigInt` (`computeBalance`, hàm thuần có unit test); cả danh sách chỉ tốn 2 truy vấn `groupBy` (theo `walletId, type` và theo `toWalletId`). Không lưu số dư vào bảng `Wallet`, nên không thể lệch với giao dịch.
- **Tiền trong JSON**: chuyển `BigInt` ↔ `number` chỉ ở `common/money.ts`; giá trị vượt `Number.MAX_SAFE_INTEGER` thì báo lỗi chứ không làm tròn.
- **Không đổi tiền tệ** sau khi tạo ví (schema `strictObject` từ chối trường `currency` khi sửa), vì mọi số dư và báo cáo của ví tính theo tiền tệ đó.
- **Client**: `useWallets`, `useCreateWallet`, `useUpdateWallet`, `useDeleteWallet`; mỗi thay đổi làm mới `['wallets']`, client không tự tính lại số dư.

## Danh mục (Giai đoạn 2)

- **API**: `GET /categories` (danh sách phẳng, cả cha và con; client lồng thành cây bằng `buildCategoryTree`), `POST /categories`, `PATCH /categories/:id`, `DELETE /categories/:id?replacementId=` (`204`). Trả danh sách phẳng để giao dịch tra danh mục theo id trực tiếp; màn hình cần cây thì tự lồng.
- **Cây tối đa 2 cấp**: danh mục cha phải là danh mục gốc, cùng `type`, cùng người dùng, chưa bị xóa; danh mục đang có con không thể thành con; không chọn chính nó làm cha. Danh mục con không truyền `color` thì lấy màu của cha.
- **Không đổi `type`** (thu ↔ chi) sau khi tạo, vì giao dịch và ngân sách cũ sẽ bị tính sai phía.
- **Lỗi nghiệp vụ theo trường**: quy tắc cần đọc database (cha không tồn tại, sai loại...) trả cùng dạng `400 VALIDATION_ERROR` với `issues[].path` (`parentId`, `replacementId`) như lỗi Zod, nên form hiển thị ngay cạnh trường bằng `toFieldErrors`.
- **Xóa**: xóa mềm danh mục **và các con** trong một `$transaction`. Nếu còn giao dịch (chưa xóa) thì phải có `replacementId` (cùng loại, không thuộc nhánh đang xóa), giao dịch được chuyển sang đó; thiếu thì trả `409 CONFLICT` với `details: { reason: "CATEGORY_IN_USE", transactionCount }` (client đọc bằng `categoryInUse(error)` rồi hỏi người dùng chọn danh mục thay thế). Ngân sách của các danh mục bị xóa cũng bị xóa mềm.
- **Khóa dòng** (`SELECT ... FOR UPDATE / FOR SHARE` bằng `$queryRaw`, vì Prisma không có API khóa dòng): danh mục đang sửa/xóa bị khóa `FOR UPDATE`, danh mục cha/thay thế bị khóa `FOR SHARE`. Nhờ vậy hai request song song không thể tạo cây 3 cấp, gắn con vào danh mục vừa bị xóa, hay chuyển giao dịch sang danh mục vừa bị xóa. **Giai đoạn 3**: khi tạo/sửa giao dịch cũng phải khóa danh mục `FOR SHARE` và kiểm tra `deletedAt IS NULL` trong cùng transaction, để giao dịch mới không rơi vào danh mục đang bị xóa.
- **Client**: `useCategories`, `useCreateCategory`, `useUpdateCategory`, `useDeleteCategory({ id, replacementId })`; thay đổi làm mới `['categories']` (từ Giai đoạn 3, xóa danh mục còn phải làm mới `['transactions']` và `['budgets']`).

## Giao diện ví và danh mục (Giai đoạn 2)

- **Logic form dùng chung** (`@finance/api-client/forms.ts`): `walletFormValues` / `toCreateWalletRequest` / `toUpdateWalletRequest` và `categoryFormValues` / `toCreateCategoryRequest` / `toUpdateCategoryRequest` đổi trạng thái form thành request đã kiểm tra bằng đúng schema của server, hoặc lỗi theo tên trường. Web và mobile chỉ giữ phần giao diện, nên cách đọc số tiền và quy tắc form không thể khác nhau giữa hai app (và có unit test).
- **Nhập số tiền**: người dùng gõ số không dấu (`1.500.000` hoặc `1500000`), kèm công tắc "Đây là khoản nợ" để thành số âm, vì bàn phím số trên điện thoại không có dấu trừ. `formatMoneyInput` (tự viết, không dùng `Intl`) hiển thị lại đúng chuỗi mà `parseMoneyInput` đọc được.
- **Tổng số dư**: `totalBalanceByCurrency` cộng các ví chưa lưu trữ theo từng tiền tệ (không cộng lẫn tiền tệ), bằng `BigInt`.
- **Chọn danh mục**: `parentCandidates` và `replacementCandidates` (trong `@finance/shared`) chỉ đưa ra lựa chọn hợp lệ theo đúng quy tắc của server; `flattenCategoryTree` cho thứ tự cha → con trong các ô chọn.
- **Xóa danh mục**: gọi `DELETE` không kèm danh mục thay thế trước; gặp `409 CATEGORY_IN_USE` thì mới hỏi chuyển giao dịch sang đâu rồi gọi lại. Không cần thêm request đếm giao dịch cho mỗi lần xóa.
- **Web**: các trang cần đăng nhập nằm trong nhóm route `(app)` với một layout chung (`AuthGate` + `AppShell` có điều hướng). Hộp thoại dùng thẻ `<dialog>` của trình duyệt (tự giữ focus, phím Esc, nền mờ), không cần thư viện UI.
- **Mobile**: 4 tab dưới (`(app)/(tabs)`: Tổng quan, Ví, Danh mục, Tài khoản) dùng `Tabs` có sẵn trong expo-router; màn thêm/sửa (`wallets/new`, `wallets/[id]`, `categories/new`, `categories/[id]`) mở dạng modal phía trên. Màn sửa đọc từ danh sách đã có trong cache (`useWallets`, `useCategories`) thay vì gọi thêm API lấy một bản ghi. Lựa chọn hiển thị bằng chip (`ChipGroup`), không thêm thư viện picker.

### Hệ thống thiết kế (phong cách app tài chính, tham khảo Money Lover)

- **Màu**: xanh lá chủ đạo `#2DB84C`; nền xám nhạt, thẻ trắng bo góc lớn (24px); **thu màu xanh dương `#2F80ED`, chi màu đỏ `#EB5757`** (số dư âm cũng màu đỏ). Token ngữ nghĩa giống nhau ở hai app: web trong `apps/web/src/app/globals.css` (`bg-canvas`, `bg-surface`, `bg-field`, `text-ink`, `text-muted`, `brand-*`, `text-income`, `text-expense`), mobile trong `apps/mobile/src/lib/theme.ts` (`useAppTheme()`). Chế độ tối định nghĩa một lần ở token.
- **Màu dùng chung qua `@finance/shared`**: `WALLET_TYPE_COLORS` (mỗi loại ví một màu), `CATEGORY_COLORS`, `CATEGORY_ICON_SUGGESTIONS`, nên một ví/danh mục trông giống nhau trên web và điện thoại.
- **Icon**: web dùng `lucide-react` (chỉ đóng gói icon được dùng); mobile dùng `expo-symbols` có sẵn trong Expo (SF Symbols trên iOS, Material Symbols trên Android), khai báo một lần trong `components/Icon.tsx` (`ICONS`). Danh mục dùng emoji trong vòng tròn tô màu nhạt (`CategoryAvatar`).
- **Font web**: Be Vietnam Pro (thiết kế cho tiếng Việt). Mobile dùng font hệ thống.
- **Bố cục**: web có sidebar trên màn hình lớn và thanh tab dưới trên điện thoại; mobile có tiêu đề lớn tự vẽ (`ScreenHeader`) ở mỗi tab. Thẻ tổng số dư màu xanh có nút ẩn/hiện số tiền (`useBalanceVisibility`, web nhớ trong `localStorage`).

## Package dùng chung

- `@finance/shared`
  - `schemas/`: Zod schema cho từng resource (create/update/query/response) và helper thuần theo resource (`buildCategoryTree`, `parentCandidates`...)
  - `money.ts`: `formatMoney(amount, currency)`, `parseMoneyInput("1.500.000")`, `formatMoneyInput(1500000)`
  - `wallet-totals.ts`: `totalBalanceByCurrency(wallets)`
  - `date.ts` (sẽ có): tính khoảng ngày của tháng theo múi giờ
  - `constants.ts`: danh mục mặc định, bảng màu danh mục
- `@finance/api-client`
  - `createApiClient({ baseUrl, clientType?, refreshTokenStorage?, refreshLock? })`: `session`, `wallets`, `categories`...
  - Hook: `useSession`, `useWallets`, `useCategories`, `useCreateWallet`...; sau này `useTransactions`, `useBudgets`, `useMonthlySummary`
  - `forms.ts`: form state → request (dùng chung web và mobile)
  - Quy ước query key (`query-keys.ts`): `['wallets']`, `['categories']`; sau này `['transactions', filters]`, `['budgets', month]`, `['reports', type, params]`

## Triển khai (gợi ý)

- Backend + PostgreSQL: Railway / Render / Fly.io
- Web: Vercel
- Mobile: EAS Build (Expo)
