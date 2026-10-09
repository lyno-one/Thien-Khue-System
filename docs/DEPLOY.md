# Deploy Thiên Khuê S lên subdomain lyno.com.vn

Mô hình: **một subdomain** (ví dụ `thienkhue.lyno.com.vn`) trên một VPS chạy Docker.

```
Trình duyệt ──HTTPS──> Caddy (:443, tự cấp chứng chỉ)
                         ├─ /api/*  ──> api (Nest, :3310) ──> Supabase dùng chung CRM, CRM apps/api
                         └─ còn lại ──> web (Next, :3300) ──(API_URL_NOI_BO)──> api
```

Web và API cùng origin nên không vướng CORS. File liên quan nằm trong [deploy/](../deploy/).

## 1. Chuẩn bị (phần người vận hành tự làm)

1. **VPS** Linux (Ubuntu 22.04+), tối thiểu 2 GB RAM (khi build Next cần nhiều RAM, nếu chỉ có 1 GB thì thêm swap). Cài Docker: `curl -fsSL https://get.docker.com | sh`.
2. **Mở cổng** 80 và 443 trên firewall của VPS.
3. **DNS** tại nơi quản lý `lyno.com.vn`: bản ghi `A`, tên `thienkhue`, trỏ về IP VPS.
   - Nếu dùng Cloudflare: lần đầu để **DNS only (mây xám)** cho Caddy xin chứng chỉ; sau đó có thể bật mây cam, đặt SSL/TLS = **Full (strict)** và sửa `TRUST_PROXY=2`.
4. **Supabase Auth** (dự án dùng chung với CRM) → Authentication → URL Configuration: thêm `https://thienkhue.lyno.com.vn/**` vào **Redirect URLs** (không đổi Site URL của CRM).
5. **CRM apps/api**: nếu CRM giới hạn CORS / origin, thêm `https://thienkhue.lyno.com.vn`. (Thiên Khuê S gọi CRM từ server api, thường không cần.)

## 2. Lần đầu deploy

```bash
git clone <repo> thien-khue && cd thien-khue/deploy
cp .env.example .env          # DOMAIN, NEXT_PUBLIC_SUPABASE_URL / ANON_KEY
cp api.env.example api.env    # DATABASE_URL (?schema=thien_khue), service role key, CRM_API_URL...
nano .env api.env

docker compose build
# Áp migration schema thien_khue (KHÔNG đụng schema public của CRM)
docker compose run --rm api node_modules/.bin/prisma migrate deploy
docker compose up -d
```

Kiểm tra:

```bash
docker compose ps                                  # api phải "healthy"
curl https://thienkhue.lyno.com.vn/api/health
docker compose logs -f api web caddy
```

## 3. Cập nhật phiên bản mới

```bash
cd thien-khue && git pull && cd deploy
docker compose build
docker compose run --rm api node_modules/.bin/prisma migrate deploy   # chỉ khi có migration mới
docker compose up -d
docker image prune -f
```

## 4. Lưu ý

- Giá trị `NEXT_PUBLIC_*` (trong `deploy/.env`) được **nhúng vào web lúc build**. Khi đổi chúng, chạy `docker compose build web` rồi `docker compose up -d`.
- `deploy/api.env` chứa service role key và mật khẩu DB. Không commit file này (đã có trong `.gitignore`), nên đặt quyền `chmod 600`.
- `DATABASE_URL` **bắt buộc** có `?schema=thien_khue`. Không bao giờ chạy `prisma migrate reset` hay `db push` trên DB thật vì DB dùng chung với CRM.
- Job đồng bộ đơn CRM (`MANG_LUOI_DONG_BO_PHUT`) chạy trong container api. Chỉ chạy **một** bản api để job không bị chạy trùng.
- Nếu bỏ Caddy vì đã có Nginx hoặc CDN riêng: xoá service `caddy`, mở cổng `3300`/`3310` ra cho proxy đó, rồi định tuyến `/api/*` vào 3310 và phần còn lại vào 3300.
