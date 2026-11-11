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
- **Chưa làm**: dọn refresh token hết hạn (job định kỳ), xác minh email, quên mật khẩu.

## Package dùng chung

- `@finance/shared`
  - `schemas/`: Zod schema cho từng resource (create/update/query/response)
  - `money.ts`: `formatMoney(amount, currency)`, `parseMoneyInput("1.500.000")`
  - `date.ts`: tính khoảng ngày của tháng theo múi giờ
  - `constants.ts`: danh mục mặc định, loại ví
- `@finance/api-client`
  - `createApiClient({ baseUrl, getAccessToken, onRefresh })`
  - Hook: `useTransactions`, `useCreateTransaction`, `useBudgets`, `useMonthlySummary`...
  - Quy ước query key: `['transactions', filters]`, `['wallets']`, `['budgets', month]`, `['reports', type, params]`

## Triển khai (gợi ý)

- Backend + PostgreSQL: Railway / Render / Fly.io
- Web: Vercel
- Mobile: EAS Build (Expo)
