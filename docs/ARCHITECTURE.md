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
