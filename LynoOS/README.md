# LynoOS

Bản sao giao diện và ứng dụng Thiên Khuê S, đổi tên nền tảng thành **LynoOS**. Tên miền production: **https://lyno.com.vn**.

## Phát triển

```sh
pnpm install --frozen-lockfile
pnpm dev
pnpm --filter web build
```

`apps/web`: Next.js; `apps/api`: NestJS; `packages/contracts`: kiểu dùng chung. Giữ nguyên các mã vai trò và schema `thien_khue` để tương thích CRM. Thương hiệu sản phẩm, pháp nhân và người duyệt Thiên Khuê vẫn theo dữ liệu gốc.

## Triển khai với Cloudflare DNS và VPS

1. Sao chép `deploy/.env.example` thành `deploy/.env`, `deploy/api.env.example` thành `deploy/api.env`. Điền cấu hình Supabase/CRM đang sử dụng. Không commit khóa bí mật.
2. Tạo bản ghi DNS `A` cho `lyno.com.vn` trỏ tới IP VPS. Chỉ tạo `AAAA` nếu VPS có IPv6 hoạt động. Mở cổng 80 và 443.
3. Trên VPS, từ thư mục `deploy`, chạy `docker compose --profile caddy up -d --build` nếu chưa có reverse proxy. VPS gốc ghi trong `docs/DEPLOY.md` đã dùng Caddy systemd: chạy `docker compose up -d --build`, thêm nội dung `deploy/Caddyfile.host` vào `/etc/caddy/Caddyfile`, validate rồi reload Caddy. Khối này proxy domain về `127.0.0.1:3400`, `/api/*` về `127.0.0.1:3410`.
4. Sau khi origin có chứng chỉ hợp lệ, bật proxy Cloudflare và SSL/TLS **Full (strict)**. Nếu bật proxy, đặt `TRUST_PROXY=2` trong `deploy/api.env`.
5. Thêm `https://lyno.com.vn/**` vào Redirect URLs trong Supabase Auth; giữ Site URL của CRM nếu Auth đang dùng chung. Không cache các đường dẫn `/api/*` và trang đăng nhập.
6. Kiểm tra `https://lyno.com.vn/api/health`, trang chủ, đăng nhập và một tác vụ có xác thực trước khi bàn giao.

Cổng host mặc định 3400/3410 giúp tránh trùng cổng 3300/3310 của bản gốc. Các container vẫn dùng 3300/3310 nội bộ. Không chạy migrate hoặc seed nếu chưa xác nhận schema/database đích; bản clone dùng lại kết nối CRM hiện có.

Cloudflare DNS không tự chạy ứng dụng Next.js/NestJS. Nếu dùng Workers thay VPS, cần chuyển đổi runtime cho cả web và API trước khi triển khai; cấu hình Docker hiện tại dành cho VPS.

Tham khảo TLS: https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/full-strict/

## Hình ảnh

Ảnh LYNO chính thức được lưu tại `apps/web/public/images/lyno`; `sources.json` ghi nguồn từng ảnh từ `https://lyno.vn/`. Bảng đối chiếu mã sản phẩm nằm tại `apps/web/src/lib/anh-san-pham-lyno.json`.

Ảnh CRM được ưu tiên. Khi thiếu hoặc tải lỗi, giao diện dùng ảnh đúng mã LYNO nếu tìm thấy; nếu không, dùng ảnh dòng sản phẩm và ghi rõ "Ảnh minh họa". Cơ chế dùng chung cho trang sản phẩm, bài học và tài liệu giới thiệu; không sửa dữ liệu CRM.

Kiểm tra ảnh production: `node scripts/kiem-tra-anh.cjs`. Cập nhật web trên VPS: chạy `bash deploy/update-web.sh` từ mã nguồn đã upload.
