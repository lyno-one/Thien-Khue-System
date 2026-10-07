# Thiên Khuê S — Mã nguồn giao diện

Bản xuất ngày 07/10/2026, lấy từ phiên bản mới nhất trên canvas thiết kế.

## Cấu trúc thư mục

```
thien-khue-s-src/
├── README.md
├── src/
│   ├── Main.dc.html     Website: trang chủ thương mại, Khách hàng VIP, Thân thiện,
│   │                    Hạnh phúc CEO / Đối tác, Đào tạo (có form đăng ký)
│   ├── LMS.dc.html      Học viện: tổng quan, khóa học, học bài, bài kiểm tra,
│   │                    chứng chỉ, bảng điều hành quản trị
│   ├── Mobile.dc.html   Trang chủ bản điện thoại (390px), có menu ngăn kéo
│   └── canvas.json      Vị trí và kích thước các bảng trên canvas
└── assets/
    └── hero-nen-trang.jpg   Ảnh hero (ảnh stock Unsplash, chỉ dùng cho demo)
```

## Lưu ý quan trọng

- Các file `.dc.html` là định dạng của canvas thiết kế. Chúng cần thư viện chạy
  `support.js` của canvas, nên mở trực tiếp bằng trình duyệt sẽ không hiển thị
  đúng. Mỗi file gồm hai phần:
  - phần giao diện trong thẻ `<x-dc>` (HTML với style viết sẵn trong từng thẻ),
  - phần logic trong `<script type="text/x-dc">` (class `Component`, hàm
    `renderVals()` chứa dữ liệu sản phẩm, khóa học, câu hỏi kiểm tra…).
- Cú pháp riêng cần đổi khi chuyển sang React/Vue/HTML thường:
  - `{{ ten_bien }}` là chỗ chèn dữ liệu,
  - `<sc-for list="..." as="...">` là vòng lặp,
  - `<sc-if value="...">` là điều kiện hiển thị,
  - `onClick="{{ ham }}"` là sự kiện bấm.
- Ảnh hero được tham chiếu bằng đường dẫn `/_blob/4b4847eb9f355166403f0828228ebe93`
  (2 chỗ: `Main.dc.html` và `Mobile.dc.html`). Khi dựng lại ở nơi khác, thay
  đường dẫn này bằng `assets/hero-nen-trang.jpg`.
- Các chỗ ghi `[...]` (tên mẫu, giá, ngày, ảnh, tỷ lệ hoa hồng…) là dữ liệu
  chưa có, cần điền thông tin thật.

## Hệ màu

| Vai trò | Mã màu |
|---|---|
| Nền chính | `#FFFFFF` |
| Xanh cobalt (chủ đạo, nút, liên kết) | `#2B59E6` |
| Xanh mực (chữ, chân trang) | `#14213D` |
| Vàng bơ (điểm nhấn, dải dạ quang) | `#FFD166` |
| Cam san hô (điểm nhấn ấm) | `#FF8A65` · chữ cam `#C2410C` |
| Tím lilac (lộ trình Nhập môn) | `#6A4CE0` |
| Xanh ngọc (lộ trình Sale/CSKH) | `#007A70` |
| Chữ phụ | `#5A6680` |
| Gradient khu Thiên Khuê, Góc sáng tạo | `linear-gradient(120deg, #1C3FAF, #3346C8, #6A3FC9)` |

Mọi cặp chữ–nền đã kiểm tra đạt chuẩn tương phản WCAG AA.

## Font chữ (Google Fonts)

- Tiêu đề: **Bricolage Grotesque** (500–800)
- Nội dung: **Be Vietnam Pro** (300–700)

## Hiệu ứng chuyển động

Khai báo trong thẻ `<style>` đầu mỗi file, dùng qua class:

- `tk-up`, `tk-d1/2/3`: trượt lên khi mở trang, xuất hiện lần lượt
- `tk-reveal`: hiện dần khi cuộn tới (Chrome/Edge)
- `tk-lift`: thẻ nổi lên khi rê chuột
- `tk-btn`, `tk-pulse`: nút nhích lên khi rê chuột, nút chính có bóng phập phồng
- `tk-flow`: gradient chuyển màu chậm
- `tk-spin`: ngôi sao trang trí xoay chậm

Tất cả tự tắt khi thiết bị bật chế độ giảm chuyển động.

## Liên kết ngoài

Mọi nút mua hàng, danh mục và "Xem thêm" đều trỏ tới https://lyno.vn/
