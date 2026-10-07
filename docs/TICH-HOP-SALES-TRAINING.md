# Tích hợp Sales Training ↔ Học viện Thiên Khuê S — hợp đồng (07/10/2026)

Hai repo:
- **Thiên Khuê S (TK)**: `D:\intern\Thien-Khue-System` — NestJS `apps/api` :3310, Next.js `apps/web` :3300, Prisma schema `thien_khue` trên Supabase dùng chung CRM.
- **Lyno Sales Training (ST)**: `D:\intern\lyno-sales-training` — Next.js 15 (app + API) :3020, Postgres riêng (container `lyno-sales-training-db`, :55432), đăng nhập bằng tài khoản CRM (cookie `st_crm`). Repo của Lyno; **không đụng** bản gốc `D:\intern\sales-training`. Giữ `LICENSE` (MIT).

## 1. Chốt với người dùng

- Sales Training là bước **"Luyện tư vấn với AI"** trong lộ trình học — **không** thay LMS. Học kiến thức / thi ≥ 90% vẫn ở TK.
- Trước mắt chỉ bắt buộc cho vai **SALE và CSKH** (CTV, KOL/KOC, thực tập sinh: giữ bài thực hành nộp tay).
- Một phiên luyện **đạt** khi `diem_tong ≥ 80` **và 0 lỗi cam kết sai chính sách**. Mỗi người cần **2 phiên đạt**: 1 loại `TU_VAN` (tư vấn bán hàng) + 1 loại `DOI_TRA` (tình huống đổi trả). Đủ → bài thực hành của khoá chuyển **CHO_CHAM**; **mentor vẫn phải duyệt** (không tự đạt).
- **Không đăng nhập lại** khi chuyển sang ST; **không dán link**: kết quả tự gửi về TK.
- Chỉ gửi **điểm + tóm tắt**, KHÔNG gửi transcript hội thoại.

## 2. Luồng

```
TK web (khoá Sale/CSKH, mục "Luyện tư vấn với AI")
  1. bấm "Bắt đầu luyện" (loai = TU_VAN | DOI_TRA)
     → TK api POST /api/dao-tao/luyen-ai/phieu {khoa_hoc_id, loai}  (Bearer người học)
     ← { ma_phieu, url_vao: "<ST_URL>/api/vao-tu-thien-khue" }
  2. web mở tab mới bằng FORM POST tự gửi tới url_vao, các trường: ma_phieu, access_token, refresh_token
     (token KHÔNG nằm trên URL)
ST
  3. /api/vao-tu-thien-khue: xác thực access_token như đăng nhập thường (CRM /api/auth/me) → đặt cookie phiên ST như /api/dang-nhap
  4. gọi TK (server→server, ký HMAC) GET /api/dao-tao/luyen-ai/phieu/:ma_phieu → ngữ cảnh {ho_so_id, crm_user_id, loai, khoa_hoc_ma, ten_khoa, ma_mau[] (SKU đã/đang học để chọn sản phẩm cho TU_VAN)}
     kiểm crm_user_id == người vừa đăng nhập; phiếu dùng 1 lần, hạn 10 phút
  5. tạo phiên luyện tập (TU_VAN: sản phẩm theo ma_mau; DOI_TRA: một tình huống trong TINH_HUONG_DOI_TRA) có gắn nguon_ngoai = {he_thong:"thien-khue", ma_phieu, loai, khoa_hoc_ma} → redirect /luyen-tap/<id>
  6. ketThucPhien xong: nếu phiên có nguon_ngoai thien-khue → POST TK /api/dao-tao/luyen-ai/ket-qua (ký HMAC), thử lại khi lỗi (cron /api/cron/quet)
TK
  7. lưu kết quả (idempotent theo phien_id) → tính đạt → đủ 1 TU_VAN đạt + 1 DOI_TRA đạt → tạo / cập nhật bai_thuc_hanh (nguon LUYEN_AI, trạng thái CHO_CHAM, bằng chứng = danh sách phiên đạt) → mentor duyệt ở /hoc-vien/cham-bai
```

## 3. Bảo mật server↔server

- Bí mật dùng chung `TICH_HOP_ST_SECRET` (≥ 32 ký tự) — env cả hai bên (`apps/api/.env.local` TK, `.env.local` ST). Không đưa ra web / bundle.
- Header: `X-TK-Thoi-Gian: <unix giây>`, `X-TK-Chu-Ky: hex(HMAC-SHA256(secret, "<thoi-gian>.<METHOD>.<path>.<raw body hoặc rỗng>"))`. Bên nhận: lệch giờ > 300 s → 401; so chữ ký bằng timingSafeEqual.
- Kết quả idempotent theo `phien_id` (unique) — gửi lại không nhân bản.

## 4. API phía TK (apps/api)

| Route | Auth | Body / trả về |
|---|---|---|
| `POST /api/dao-tao/luyen-ai/phieu` | Bearer, người học có vai SALE/CSKH (DANG_HOC hoặc HOAT_DONG), khoá có yêu cầu luyện AI | `{khoa_hoc_id, loai:"TU_VAN"\|"DOI_TRA"}` → `{ma_phieu, url_vao, het_han}` |
| `GET /api/dao-tao/luyen-ai/phieu/:ma` | HMAC (ST gọi), `@CongKhai` | → `{ho_so_id, crm_user_id, loai, khoa_hoc_ma, ten_khoa, ma_mau:[]}`; đánh dấu đã dùng; hết hạn / đã dùng → 410 |
| `POST /api/dao-tao/luyen-ai/ket-qua` | HMAC, `@CongKhai` | `{ma_phieu, phien_id, crm_user_id, loai, diem_tong, diem_ky_nang:{khai_thac,lang_nghe,gia_tri,phan_doi,chot,tuan_thu}, so_vi_pham, vi_pham:[{loai,trich}], tom_tat, diem_manh:[], can_cai_thien:[], link_xem, ket_thuc_luc}` → `{dat, tien_do:{TU_VAN:boolean, DOI_TRA:boolean}, bai_thuc_hanh_id?}` |
| `GET /api/dao-tao/khoa-hoc/:id/luyen-ai` | Bearer người học | tiến độ + danh sách phiên của mình |

- Bảng mới (schema `thien_khue`): `phieu_luyen_ai` (ma unique ngẫu nhiên, ho_so_id, khoa_hoc_id, loai, het_han, dung_luc), `phien_luyen_ai` (phien_id_st unique, ho_so_id, khoa_hoc_id, loai, diem_tong, diem_ky_nang jsonb, so_vi_pham, vi_pham jsonb, tom_tat, dat, link_xem, nhan_luc). `khoa_hoc.yeu_cau_luyen_ai jsonb` (vd `{"nguong":80,"can":{"TU_VAN":1,"DOI_TRA":1}}`), `bai_thuc_hanh.nguon` (`NOP_TAY`|`LUYEN_AI`) + bằng chứng.
- Seed: khoá `sale-cskh` bật `yeu_cau_luyen_ai` + `can_thuc_hanh`.
- Env TK: `SALES_TRAINING_URL=http://localhost:3020`, `TICH_HOP_ST_SECRET`.

## 5. Phía ST

- `POST /api/vao-tu-thien-khue` (form, không cần đăng nhập trước; thêm vào danh sách bỏ qua của middleware).
- Migration `011-tich-hop-thien-khue.sql`: `phien_luyen_tap.nguon_ngoai jsonb`, `gui_ket_qua_luc`, `gui_ket_qua_loi`, `so_lan_gui`.
- Gửi kết quả sau `ketThucPhien` (không chặn phản hồi cho người dùng); cron `/api/cron/quet` gửi bù phiên chưa gửi được.
- Env ST: `THIEN_KHUE_API_URL=http://localhost:3310`, `TICH_HOP_ST_SECRET`.
- Phiên mở từ TK: trang luyện tập hiện nhãn "Bài thực hành Thiên Khuê" + nút "Quay lại học viện".

## 6. Kiểm

- Unit hai bên: HMAC (đúng / sai / lệch giờ), phiếu 1 lần + hết hạn + sai người, luật đạt (79 trượt, 80 + 0 vi phạm đạt, 90 + 1 vi phạm trượt), đủ 2 loại mới CHO_CHAM, idempotent.
- E2E local: TK web → bấm luyện → ST đã đăng nhập → kết thúc phiên (AI_MODE không cấu hình → chế độ dự phòng theo luật, không tốn AI) → TK nhận kết quả → mentor thấy ở Chấm bài.

## 7. Trạng thái (07/10/2026)

**Đã làm xong hai phía, chạy thật end-to-end ở local. Chưa commit / push.**

### Đã có
- **TK** (`D:\intern\Thien-Khue-System`): migration `apps/api/prisma/migrations/20261007170000_luyen_ai` (`phieu_luyen_ai`, `phien_luyen_ai`, `khoa_hoc.yeu_cau_luyen_ai`, `bai_thuc_hanh.nguon` + `bang_chung`); 4 route ở mục 4 (`controllers/dao-tao-luyen-ai.controller.ts`, guard `common/guards/hmac-st.guard.ts`, `rawBody: true` ở `main.ts`); web `features/dao-tao/khoi-luyen-ai.tsx` (khối «Luyện tư vấn với AI» trong trang khoá, Sale/CSKH) và bằng chứng ở `/hoc-vien/cham-bai`. Seed khoá `sale-cskh` có `yeu_cau_luyen_ai`.
- **ST** (`D:\intern\lyno-sales-training`): migration `011-tich-hop-thien-khue.sql`; `POST /api/vao-tu-thien-khue`, trang lỗi `/vao-tu-thien-khue`; `core/thien-khue.ts`, `services/thien-khue.ts` (gửi kết quả bằng `after()`, gửi bù trong `/api/cron/quet`); `components/TheThienKhue.tsx`.

### Chỗ khác / chặt hơn bản hợp đồng ở trên (hai bên đã khớp)
- Phản hồi TK luôn bọc `{ data: ... }`, lỗi `{ error: { code, message } }`. ST đọc cả thân trần lẫn `{data}`.
- Đường dẫn ký HMAC: ST ký pathname đầy đủ `/api/dao-tao/luyen-ai/...` (không query); TK chấp nhận thêm dạng bỏ `/api` và dạng có query. Lỗi chữ ký → 401 `HMAC_THIEU_HEADER | HMAC_LECH_GIO | HMAC_SAI_CHU_KY | HMAC_CHUA_CAU_HINH`.
- `GET phieu/:ma`: không có → 404; hết hạn → 410 `PHIEU_HET_HAN`; đã dùng → 410 `PHIEU_DA_DUNG`. Phiếu bị đánh dấu dùng ngay khi trả 200: ST tạo phiên lỗi thì người học lấy phiếu mới.
- `POST ket-qua`: phiếu phải đã được đổi (409 nếu chưa), `crm_user_id` sai → 403, `loai` khác phiếu → 400, `phien_id` đã ghi cho người / khoá khác → 409. Hạn 10 phút không áp cho kết quả. Trường lạ bị bỏ, không báo lỗi. Số vi phạm = max(`so_vi_pham`, `vi_pham.length`).
- `vi_pham[].loai` = mã luật đổi trả của ST (`HUA_HOAN_TIEN`, `HUA_DOI_KHI_KHONG_DUOC`, …) hoặc `AI_NHAN_XET` (lỗi do AI chấm nêu — cũng tính là vi phạm).
- **Refresh token (sửa lúc nối E2E):** hai app không được cùng làm mới MỘT phiên Supabase (xoay vòng refresh token + phát hiện dùng lại → thu hồi cả họ phiên, cả TK lẫn ST bị đăng xuất). Nên: TK web gọi `supabase.auth.refreshSession()` ngay trước khi gửi form (access token còn ~1 giờ); TK vẫn gửi trường `refresh_token` như hợp đồng nhưng **ST bỏ qua, không lưu** (cookie `st_crm` có `r` rỗng → middleware không làm mới, hết hạn thì về `/dang-nhap`); đăng xuất ở ST với phiên này chỉ xoá cookie, không gọi Supabase `/logout`.
- Web TK mở sẵn tab tên riêng lúc bấm (tránh chặn popup) rồi POST form vào tab đó.

### Env
| Repo | File | Biến |
|---|---|---|
| TK | `apps/api/.env.local` | `SALES_TRAINING_URL=http://localhost:3020`, `TICH_HOP_ST_SECRET=tk-st-local-2026-10-07-bi-mat-dung-chung-0123456789ab` |
| ST | `.env.local` | `THIEN_KHUE_API_URL=http://localhost:3310`, `THIEN_KHUE_WEB_URL=http://localhost:3300`, `TICH_HOP_ST_SECRET=` (giống hệt TK), `SALES_TRAINING_URL` tuỳ chọn |

`.env.example` hai bên để trống bí mật. Bí mật trên chỉ dùng local.

### Lệnh chạy local
```
# CRM (:3220) và Supabase (:54321) chạy sẵn
cd D:\intern\Thien-Khue-System
pnpm --filter api dev                       # :3310 (nest --watch)
pnpm --filter web build; pnpm --filter web start   # :3300
cd D:\intern\lyno-sales-training
cmd /c "set AI_MODE=du_phong&& corepack pnpm dev"   # :3020, chấm theo luật, không tốn AI
#   (đặt AI_MODE rỗng không được: Next lấy lại AI_MODE=cli từ .env.local)
#   muốn AI thật thì bỏ "set AI_MODE=du_phong&&"
```
Tài khoản thử: học viên `employee.sales02@lyno.test`, mentor `manager.sales@lyno.test` (mật khẩu seed `LynoLocal@2026`). Học viên vào `/hoc-vien/khoa-hoc/sale-cskh#luyen-ai`.

### Đã kiểm E2E (Playwright, Chrome, 07/10/2026)
1. Đăng nhập TK web bằng `employee.sales02` → khoá «Sale / CSKH chuẩn LYNO» → «Bắt đầu luyện» (Tư vấn bán hàng) → tab ST mở thẳng `/luyen-tap/<id>`, **đã đăng nhập**, nhãn «Bài thực hành Thiên Khuê» → nhắn 5 câu → «Kết thúc & chấm điểm» (chế độ dự phòng) → **74 điểm, chưa đạt** → ST «Đã gửi kết quả về học viện» → `thien_khue.phien_luyen_ai` có bản ghi, khối TK hiện «Chưa đạt · cao nhất 74».
2. Lặp với Tình huống đổi trả (tình huống quá hạn 7 ngày) → **50 điểm, 2 vi phạm** (`HUA_DOI_KHI_KHONG_DUOC`, `HUA_HOAN_TIEN`) → chưa đạt, TK ghi đúng.
3. Nhánh đạt: chế độ dự phòng không đạt ngưỡng, nên **gửi thêm 2 kết quả mô phỏng bằng script ký HMAC** (`phien_id` = `e2e-script-tu-van-dat`, `e2e-script-doi-tra-dat`, 86 điểm, 0 vi phạm, tóm tắt ghi «[Script E2E …]») → lần 2 trả `bai_thuc_hanh_id`, bài nguồn `LUYEN_AI` ở **CHO_CHAM**; học viên thấy «Chờ mentor duyệt»; `manager.sales` thấy bài ở `/hoc-vien/cham-bai` (nhãn «Luyện tư vấn với AI», điểm từng kỹ năng, link xem lại). Gửi lặp lại → cùng kết quả, không nhân bản. Chữ ký sai → 401. Form thiếu dữ liệu → ST 303 `?loi=thieu`.
4. Ảnh: `docs/anh-giao-dien/luyen-ai-1-*` (tư vấn), `luyen-ai-2-*` (đổi trả), `luyen-ai-3-tk-hoc-vien-cho-mentor-duyet.png`, `luyen-ai-4-tk-mentor-cham-bai.png`, `luyen-ai-5-tk-mentor-hop-thoai-cham.png`.

Dữ liệu thử còn lại trong DB local (seed, xoá / reseed thoải mái): 4 dòng `thien_khue.phien_luyen_ai` + 1 `bai_thuc_hanh` LUYEN_AI CHO_CHAM của `employee.sales02`; 2 phiên ST có `nguon_ngoai`.

### Còn lại
- Luật đổi trả của ST bắt nhầm câu phủ định: «em xin phép **không hứa** trước việc hoàn tiền» bị tính `HUA_HOAN_TIEN` (thấy trong E2E bước 2) — cần sửa `core/doi-tra.ts` của ST, nếu không học viên nói đúng vẫn trượt.
- Chưa có màn quản trị bật / sửa `yeu_cau_luyen_ai` cho khoá khác (chỉ qua seed / DB). Mentor chưa nhận thông báo khi có bài LUYEN_AI mới.
- Bài nộp tay cũ đang CHO_CHAM ở khoá `sale-cskh` vẫn nằm song song với bài LUYEN_AI.
- Cron gửi bù trên Vercel chạy 1 lần / ngày; ở local phải gọi tay `/api/cron/quet`.
- Chưa tắt phần khoá học riêng của ST (`/dao-tao`).
