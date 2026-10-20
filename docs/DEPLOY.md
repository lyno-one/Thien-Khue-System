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
docker compose up -d                    # VPS đã có Caddy chạy trên máy (xem 2.1)
# docker compose --profile caddy up -d  # VPS trống: chạy kèm container Caddy giữ :80/:443
```

### 2.1. VPS dùng chung với CRM (Caddy chạy trực tiếp trên máy)

VPS OCI `150.230.154.52` đã có Caddy (systemd) phục vụ `crm` / `api` / `doitra` / `app.lyno.com.vn`. Không bật profile `caddy`; web/api chỉ mở `127.0.0.1:3300` / `127.0.0.1:3310`. Thêm khối sau vào **cuối** `/etc/caddy/Caddyfile`:

```
thienkhue.lyno.com.vn {
	encode zstd gzip
	handle /api/* {
		reverse_proxy 127.0.0.1:3310
	}
	handle {
		reverse_proxy 127.0.0.1:3300
	}
}
```

```bash
sudo cp /etc/caddy/Caddyfile /etc/caddy/Caddyfile.bak-$(date +%F)
sudo nano /etc/caddy/Caddyfile
sudo caddy validate --config /etc/caddy/Caddyfile && sudo systemctl reload caddy
```

`reload` không làm gián đoạn các site CRM đang chạy. `api.env`: `TRUST_PROXY=1`, `CRM_API_URL=https://api.lyno.com.vn`. Nếu cổng 3300/3310 trên máy đã bị chiếm, đặt `WEB_PORT` / `API_PORT` trong `deploy/.env` rồi sửa cổng trong khối Caddy cho khớp.

Kiểm tra:

```bash
docker compose ps                                  # api phải "healthy"
curl https://thienkhue.lyno.com.vn/api/health
docker compose logs -f api web
```

## 3. Cập nhật phiên bản mới

```bash
cd thien-khue && git pull && cd deploy
docker compose build
docker compose run --rm api node_modules/.bin/prisma migrate deploy   # chỉ khi có migration mới
docker compose up -d
docker image prune -f
```

Hoặc gọn hơn: `git pull && bash deploy/vps-trien-khai.sh` (build, `migrate deploy`, `up -d`, chờ api healthy).

### 3.1. Tự deploy khi push lên `main`

Workflow [.github/workflows/deploy-vps.yml](../.github/workflows/deploy-vps.yml) SSH vào VPS, `git pull --ff-only` rồi chạy `deploy/vps-trien-khai.sh`. Push chỉ đổi `LynoOS/`, `docs/`, `thien-khue-s-src/` hoặc file `.md` thì không deploy. Có thể chạy tay ở tab Actions (`workflow_dispatch`). Dùng chung khoá `flock /tmp/lyno-deploy.lock` với CRM / LynoMe.

Cài một lần (GitHub repo → Settings → Secrets and variables → Actions):

| Loại | Tên | Giá trị |
|---|---|---|
| Secret | `VPS_SSH_KEY` | private key SSH vào `opc@<VPS>` (có thể dùng lại khoá deploy của CRM) |
| Secret | `VPS_KNOWN_HOSTS` | kết quả `ssh-keyscan <IP VPS>` |
| Variable (tuỳ chọn) | `VPS_HOST` | mặc định `150.230.154.52` |
| Variable (tuỳ chọn) | `VPS_THU_MUC` | thư mục repo trên VPS, mặc định `~/apps/thien-khue` |

Trên VPS, thư mục đó phải là bản `git clone` của repo (để `git pull --ff-only` chạy được, không có sửa đổi local), đã có `deploy/.env` và `deploy/api.env`. Repo private thì VPS cần deploy key / token để pull. Chưa có secret `VPS_SSH_KEY` thì workflow chỉ cảnh báo và bỏ qua.

## 4. Lưu ý

- Giá trị `NEXT_PUBLIC_*` (trong `deploy/.env`) được **nhúng vào web lúc build**. Khi đổi chúng, chạy `docker compose build web` rồi `docker compose up -d`.
- `deploy/api.env` chứa service role key và mật khẩu DB. Không commit file này (đã có trong `.gitignore`), nên đặt quyền `chmod 600`.
- `DATABASE_URL` **bắt buộc** có `?schema=thien_khue`. Không bao giờ chạy `prisma migrate reset` hay `db push` trên DB thật vì DB dùng chung với CRM.
- Job đồng bộ đơn CRM (`MANG_LUOI_DONG_BO_PHUT`) chạy trong container api. Chỉ chạy **một** bản api để job không bị chạy trùng.
- Dùng Nginx thay Caddy: không bật profile `caddy`, định tuyến `/api/*` vào `127.0.0.1:3310` và phần còn lại vào `127.0.0.1:3300`.
