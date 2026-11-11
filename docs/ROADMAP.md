# Roadmap

Đánh dấu `[x]` khi xong. Mỗi mục nên là một nhánh và một Pull Request.

## Giai đoạn 0 – Nền móng

- [x] Tạo monorepo (pnpm + Turborepo), cấu hình TypeScript, ESLint, Prettier dùng chung
- [x] docker-compose PostgreSQL, Prisma schema đầu tiên, migration `init`
- [x] Khung NestJS: prefix `/api/v1`, Zod pipe, filter lỗi, cấu hình `.env`
- [ ] Khung Next.js và Expo chạy được, kết nối `@finance/shared`, `@finance/api-client`
- [ ] GitHub Actions: lint + typecheck + test cho mỗi PR

## Giai đoạn 1 – Tài khoản

- [ ] Đăng ký, đăng nhập, refresh, logout (backend + test)
- [ ] Tạo danh mục mặc định khi đăng ký
- [ ] Màn đăng nhập/đăng ký trên web và mobile, lưu token an toàn

## Giai đoạn 2 – Ví và danh mục

- [ ] CRUD ví, trả kèm số dư hiện tại
- [ ] CRUD danh mục (cha-con, icon, màu)
- [ ] Giao diện quản lý ví và danh mục (web + mobile)

## Giai đoạn 3 – Giao dịch

- [ ] CRUD giao dịch thu/chi/chuyển ví, cập nhật số dư trong transaction
- [ ] Danh sách giao dịch theo tháng, lọc, tìm kiếm, phân trang cursor
- [ ] Mobile: màn thêm nhanh giao dịch
- [ ] Web: bảng giao dịch có lọc và sửa

## Giai đoạn 4 – Ngân sách

- [ ] CRUD ngân sách theo tháng và danh mục, tính đã dùng / còn lại / %
- [ ] Cảnh báo ≥ 80% và vượt 100%
- [ ] Giao diện ngân sách (thanh tiến độ)

## Giai đoạn 5 – Báo cáo

- [ ] API tổng hợp tháng, theo danh mục, xu hướng nhiều tháng
- [ ] Mobile: màn tổng quan + biểu đồ tròn
- [ ] Web: trang báo cáo chi tiết, biểu đồ cột xu hướng

## Giai đoạn 6 – Hoàn thiện và triển khai

- [ ] Test E2E luồng chính
- [ ] Deploy backend + DB, web, build mobile bằng EAS
- [ ] README có ảnh chụp màn hình, link demo, sơ đồ kiến trúc

## Sau MVP

- [ ] Giao dịch định kỳ
- [ ] Mục tiêu tiết kiệm
- [ ] Nhập/xuất CSV
- [ ] Offline trên mobile + endpoint `/sync`
- [ ] Push notification nhắc ghi chép
