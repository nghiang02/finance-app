# Bối cảnh dự án – Quản lý tài chính cá nhân

## Mục tiêu

Giúp một người dùng cá nhân nắm được tiền của mình: tiền vào, tiền ra, còn bao nhiêu, đang tiêu vượt ở đâu. Dùng hằng ngày trên điện thoại để ghi nhanh, xem phân tích kỹ trên web. Dữ liệu đồng bộ giữa các thiết bị theo tài khoản.

## Người dùng

- Người đi làm hoặc sinh viên ở Việt Nam, tiền tệ chính là VND.
- Ghi chép hằng ngày, thường dưới 10 giây cho một giao dịch.

## Khái niệm nghiệp vụ

| Khái niệm                   | Mô tả                                                                                                                                              |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Ví (Wallet)**             | Nơi giữ tiền: tiền mặt, tài khoản ngân hàng, thẻ tín dụng, ví điện tử. Có số dư ban đầu và tiền tệ.                                                |
| **Danh mục (Category)**     | Phân loại giao dịch, thuộc loại `INCOME` hoặc `EXPENSE`, có thể có danh mục con (VD: Ăn uống → Cà phê). Có bộ danh mục mặc định khi tạo tài khoản. |
| **Giao dịch (Transaction)** | Loại `INCOME`, `EXPENSE` hoặc `TRANSFER` (chuyển giữa hai ví). Có số tiền, ngày, ví, danh mục, ghi chú.                                            |
| **Ngân sách (Budget)**      | Hạn mức chi cho một danh mục (hoặc tổng) trong một tháng. Theo dõi đã dùng / còn lại / phần trăm.                                                  |
| **Báo cáo (Report)**        | Tổng thu, tổng chi, chênh lệch theo tháng; cơ cấu chi theo danh mục; xu hướng nhiều tháng.                                                         |

## Quy tắc nghiệp vụ

- Số tiền giao dịch luôn **dương**; loại giao dịch quyết định cộng hay trừ.
- `TRANSFER` trừ ví nguồn, cộng ví đích, **không** tính vào tổng thu/chi của báo cáo.
- Số dư ví = số dư ban đầu + thu − chi ± chuyển.
- Ngân sách "đã dùng" = tổng giao dịch `EXPENSE` thuộc danh mục đó (gồm danh mục con) trong tháng.
- Cảnh báo khi ngân sách dùng ≥ 80% và khi vượt 100%.
- Tháng báo cáo tính theo múi giờ người dùng (mặc định `Asia/Ho_Chi_Minh`).
- Xóa ví đang có giao dịch: hỏi xác nhận; xóa mềm, giao dịch vẫn giữ để báo cáo không sai.
- Xóa danh mục đang dùng: yêu cầu chọn danh mục thay thế cho các giao dịch cũ.

## Tính năng theo mức ưu tiên

**MVP**

- Đăng ký, đăng nhập (email + mật khẩu)
- Quản lý ví, danh mục (có bộ mặc định)
- Thêm / sửa / xóa giao dịch thu, chi, chuyển ví
- Danh sách giao dịch theo tháng, lọc theo ví và danh mục
- Ngân sách theo tháng và danh mục, có cảnh báo
- Báo cáo tháng: tổng thu, tổng chi, biểu đồ tròn theo danh mục
- Đồng bộ giữa mobile và web

**Sau MVP**

- Giao dịch định kỳ (lương, tiền nhà, subscription)
- Mục tiêu tiết kiệm
- Nhập/xuất CSV, Excel
- Đính kèm ảnh hóa đơn
- Nhắc nhập giao dịch hằng ngày (push notification)
- Dùng offline trên mobile, tự đồng bộ khi có mạng
- Nhiều tiền tệ, quy đổi tỷ giá

## Ngoài phạm vi (hiện tại)

- Kết nối trực tiếp tài khoản ngân hàng
- Chia sẻ ví cho nhiều người dùng
- Đầu tư, chứng khoán, crypto
