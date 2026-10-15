# LynoOS production

- URL: https://lyno.com.vn
- VPS: `opc@150.230.154.52`
- Source: `/home/opc/apps/lynoos`
- Compose project: `lynoos`
- Web: `127.0.0.1:3400`; API: `127.0.0.1:3410`
- Caddy: `/etc/caddy/Caddyfile`; cấu hình nguồn của CRM tại `/home/opc/apps/crm/deploy/Caddyfile` đã được thêm khối LynoOS.
- HTTPS: chứng chỉ Let's Encrypt đã cấp thành công.
- Kiểm tra: frontend TypeScript và production build thành công; Docker web/API chạy, API healthy; trang chủ có thương hiệu LynoOS, trang đăng nhập trả HTTP 200 qua HTTPS.

LynoOS dùng chung backend CRM/Supabase và schema `thien_khue` với bản gốc. Chưa kiểm thử đăng nhập bằng tài khoản thực hoặc thao tác nghiệp vụ có ghi dữ liệu.

Kiểm tra vận hành từ thư mục `deploy` trên VPS: `docker compose ps`, `docker compose logs --tail=100 web api`. Build lại: `docker compose up -d --build`. Không bật profile `caddy` trên VPS này.

File môi trường thật đã được đặt quyền 600 trên VPS. SSH key gốc trong `crm_lyno_new` được giữ nguyên.

## Cập nhật ảnh

Đã triển khai 71 ảnh chính thức từ LYNO, đối chiếu 56 mã sản phẩm và thay các khung ảnh trống ở trang chủ, khăn lụa, đào tạo. Ảnh dự phòng dùng chung cho sản phẩm, bài học và tài liệu giới thiệu; ảnh theo nhóm có nhãn minh họa.

Kiểm tra production thành công: 81 URL ảnh (71 file gốc cùng ảnh tối ưu), các trang `/`, `/dao-tao`, `/san-pham` trả HTTP 200 và không còn chữ giữ chỗ ảnh. Lệnh kiểm tra: `node scripts/kiem-tra-anh.cjs`.
