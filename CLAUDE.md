# CLAUDE.md – Finance App (Quản lý tài chính cá nhân)

## Dự án là gì

App quản lý tài chính cá nhân: ghi chép thu chi, nhiều ví/tài khoản, danh mục, ngân sách theo tháng, báo cáo. Có 3 client dùng chung một backend và đồng bộ dữ liệu theo tài khoản người dùng:

- **apps/backend**: Node.js, NestJS, Prisma, PostgreSQL, REST API `/api/v1`
- **apps/mobile**: React Native (Expo, Expo Router)
- **apps/web**: Next.js (App Router), Tailwind

Chi tiết nghiệp vụ: `docs/PROJECT_CONTEXT.md`. Kiến trúc, data model, API: `docs/ARCHITECTURE.md`. Tiến độ: `docs/ROADMAP.md`. Đọc file liên quan trước khi làm một tính năng mới.

## Lệnh thường dùng

```bash
docker compose up -d                 # bật PostgreSQL
docker compose exec postgres createdb -U finance finance_test   # một lần: DB cho integration test
pnpm dev                             # chạy tất cả app
pnpm --filter backend dev            # chỉ backend
pnpm --filter web dev                # chỉ web (http://localhost:3001)
pnpm --filter mobile start           # chỉ mobile (Expo)
pnpm --filter backend prisma migrate dev --name <ten>
pnpm lint && pnpm typecheck && pnpm test   # chạy trước khi commit
```

## Quy tắc bắt buộc

1. **Tiền luôn là số nguyên** (`BigInt` trong DB, `number` nguyên ở client), lưu theo đơn vị nhỏ nhất của tiền tệ (VND: đồng). Không dùng float cho tiền. Định dạng hiển thị bằng hàm trong `@finance/shared`.
2. **Schema dùng chung**: mọi request/response được định nghĩa bằng Zod trong `packages/shared`. Backend validate bằng schema đó; web và mobile dùng type suy ra từ schema. Không định nghĩa lại type ở từng app.
3. **Gọi API chỉ qua `packages/api-client`**. Không gọi `fetch` trực tiếp trong màn hình hay component.
4. **Mọi truy vấn dữ liệu phải lọc theo `userId`** của người đang đăng nhập. Không bao giờ trả dữ liệu của người khác.
5. **Ngày giờ**: lưu UTC trong DB; hiển thị theo múi giờ người dùng (mặc định `Asia/Ho_Chi_Minh`). Báo cáo theo tháng tính theo múi giờ người dùng.
6. **Xóa mềm** (`deletedAt`) cho giao dịch, ví, danh mục để đồng bộ được giữa các thiết bị.
7. Không commit `.env`, secret, hay token. Không log mật khẩu hay token.

## Quy ước code

- TypeScript strict ở mọi nơi, không dùng `any` (dùng `unknown` rồi thu hẹp kiểu).
- Tên file: `kebab-case.ts`; component React: `PascalCase.tsx`.
- Backend: mỗi tính năng một module NestJS (`controller`, `service`, `dto`); logic nghiệp vụ nằm trong service, controller chỉ nhận request và trả response.
- Client: state từ server dùng TanStack Query; state giao diện cục bộ dùng `useState` hoặc Zustand (mobile).
- Giao diện hiển thị tiếng Việt; tên biến, hàm, commit message bằng tiếng Anh.
- Commit theo Conventional Commits: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`.

## Cách làm việc với Claude

- Trả lời và giải thích bằng tiếng Việt.
- Trước khi sửa nhiều file, nêu ngắn gọn kế hoạch (file nào, thay đổi gì).
- Tính năng mới: làm theo thứ tự schema Zod (shared) → Prisma/migration → service + controller + test (backend) → api-client → giao diện web/mobile.
- Viết hoặc cập nhật test cho logic tính tiền, ngân sách và báo cáo.
- Sau khi xong một mục trong `docs/ROADMAP.md`, đánh dấu `[x]`.
- Không tự thêm thư viện lớn mới khi chưa hỏi.
