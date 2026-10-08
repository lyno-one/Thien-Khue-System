# Tiến độ Thiên Khuê S — cập nhật 07/10/2026 chiều

Đọc file này trước khi làm tiếp (cùng `CLAUDE.md`, `docs/KIEN-TRUC.md`, `docs/LOI-CAN-SUA.md`, `docs/TICH-HOP-SALES-TRAINING.md`).
**Chưa commit / push gì** ở Thien-Khue-System, LynoMe (phần sau f7d039e), lyno-sales-training (phần tích hợp), CRM (phần nhóm quyền mới).

## Đã xong (local)

1. Dựng Thiên Khuê S: monorepo pnpm, NestJS :3310 + Next.js :3300 + Prisma schema `thien_khue` trên Supabase dùng chung CRM. Đăng nhập = tài khoản CRM.
2. Sửa 16 lỗi nghiêm trọng + cao (`docs/LOI-CAN-SUA.md` có dòng Trạng thái). Còn 14 lỗi mức "vừa" chưa sửa.
3. Sửa treo "Đang kiểm tra phiên đăng nhập" (auth-provider gọi getSession trong onAuthStateChange).
4. Refactor apps/api theo bố cục PHẲNG như CRM: controllers/ services/ repositories/ (1 file/module) dto/ common/ infrastructure/ jobs/ modules/. 371+ test xanh.
5. Giao diện trắng xanh theo DESIGN.md CRM; ảnh sản phẩm thật từ CRM trong bài học; MỘT menu chung (Học viện · Làm việc · Thành viên · Quản trị · Cá nhân), nút thu gọn nằm trong sidebar, trang học bài tự thu gọn; header chỉ hiện vai cao nhất (+N vai).
6. Nối Sales Training (`D:\intern\lyno-sales-training`) vào học viện — xong + E2E thật (ảnh `docs/anh-giao-dien/luyen-ai-*.png`):
   - Chỉ SALE + CSKH bắt buộc. Phiên đạt = điểm ≥ 80 + 0 lỗi chính sách; cần 1 TU_VAN + 1 DOI_TRA đạt → bài thực hành LUYEN_AI chờ mentor duyệt.
   - Vào thẳng Sales Training không đăng nhập lại (form POST token), điểm tự gửi về (HMAC `TICH_HOP_ST_SECRET`).
   - Còn: luật đổi trả của ST bắt nhầm câu phủ định ("không hứa trước việc hoàn tiền" bị tính lỗi) — cần sửa `core/doi-tra.ts` ở ST; chưa có màn bật yeu_cau_luyen_ai cho khoá khác; mentor chưa nhận thông báo bài mới; chưa tắt khoá học riêng /dao-tao của ST.
6b. **Xem lại phiên Sales Training đúng người (08/10, chưa commit)** — lỗi: link «Xem lại phiên» trần → ST dùng cookie cũ của người khác → 404. Phía TK xong: phiếu XEM (`POST /api/dao-tao/luyen-ai/phien/:id/phieu-xem`, HMAC `GET /api/dao-tao/luyen-ai/phieu-xem/:ma`, hạn 2 phút, 1 lần; chủ phiên / MENTOR / QUAN_LY), migration `20261008100000_phieu_xem_luyen_ai`, web dùng helper chung `features/dao-tao/mo-sales-training.ts` cho cả «Bắt đầu luyện» và «Xem lại»; `link_xem` TK tự dựng; đã xoá 2 phiên giả `e2e-script-*` + bài LUYEN_AI + thông báo của chúng. **Phía ST xong (08/10, chưa commit)**: `POST /api/vao-tu-thien-khue/xem` theo mục 8.4 (kiểm Origin, thay cookie cũ, quyền chỉ đọc 2 giờ cho MENTOR / QUAN_LY); E2E local đạt với admin.local xem phiên Võ Minh Telesale. Lưu ý: trang «Chấm bài» chỉ hiện nút khi có bài LUYEN_AI — hiện chưa có bài nào nên E2E xin phiếu XEM bằng đúng các bước của nút trong tab TK.
6c. **Sửa theo security review (08/10, chưa commit)**: «Bắt đầu luyện» không gửi `refresh_token` nữa (chỉ `ma_phieu` + `access_token`); `mo-sales-training.ts` cắt `tab.opener` + chỉ POST token khi `url_vao` cùng origin `NEXT_PUBLIC_SALES_TRAINING_URL` (thêm vào `.env.local` / `.env.example`; bỏ trống = chỉ kiểm http/https); `VaiService.doiTrangThai`: vai thuộc `VAI_TU_CRM` chỉ HOAT_DONG lại khi CRM hiện cấp vai đó; token: `sdt` chỉ lấy `payload.phone` (bỏ `user_metadata.sdt` — người dùng tự sửa được; quyền xem hạng/đơn vốn đã cần `sdt_xac_minh_luc`); phát phiếu luyện / phiếu XEM giới hạn 10/phút/người (429) + dọn phiếu hết hạn >1 giờ (chưa dùng + XEM; giữ phiếu LUYEN đã dùng vì ST nộp kết quả theo mã); header bảo mật web (nosniff, Referrer-Policy, X-Frame-Options SAMEORIGIN + `frame-ancestors 'self'`, HSTS chỉ production) và API (nosniff, X-Frame-Options DENY, Referrer-Policy). Chờ người dùng quyết: có kết thúc các dòng vai CRM cấp tay hiện có (vd admin.local) không — CHƯA chạy.
7. Bàn phê duyệt gọn lại (agent "duyet-gon", workflow wf_c95ad0af-9b8): 2 bước (đề xuất → duyệt); tiền (chi trả / điều chỉnh hoa hồng, xác minh đơn trùng) giữ 3 bước. KIỂM xem agent này đã xong chưa (journal) — nếu dở thì chạy lại phần kiểm.

## ĐANG LÀM khi dừng phiên — HƯỚNG MỚI VỀ ROLE (người dùng chốt 07/10 chiều)

**Mọi role là role THƯỜNG trong CRM; Thiên Khuê S chỉ load role / quyền từ CRM. KHÔNG có "vai Thiên Khuê" riêng, KHÔNG map chức danh (marketing → KOC…).**

- CRM đang ở NHÁNH `feat/nhom-quyen-thien-khue` (đã push bản WIP 4273350 lúc ~14:40; phần agent làm sau đó chưa commit — commit tiếp lên nhánh này, rồi mở PR vào main). main trên remote đã có thêm 1 commit mới sau d77b213.
- CRM: thêm nhóm quyền phòng ban mới **THUC_TAP, CTV, KOL, KOC, DOI_TAC** (migration **079_nhom_quyen_thien_khue.sql**; 078 đã là `078_kb_luu_quiz.sql` từ remote). Agent CRM đang làm (có thể dở):
  - Quyền trong CRM web: CHỈ Đào tạo (/kb) + Chấm công. Không đơn / kho / khách / vận chuyển / đối soát / đổi trả.
  - **Vẫn dùng LynoMe bình thường** (chấm công, nghỉ phép, giải trình, thông báo).
  - KB vị trí đào tạo: THUC_TAP→thuc_tap, CTV→ctv, KOL/KOC→kol_koc, DOI_TAC→doi_tac.
  - Phòng ban UI cho chọn nhóm mới; tài khoản thử employee.ctv01 / employee.koc01 / employee.tts01 @lyno.test (LynoLocal@2026).
  - Kiểm: `git status` ở D:\intern\CRM_Lyno-, migration 079 có / đã áp chưa, test qa/unit + qa/integration auth-quan-tri xanh chưa.
- Thiên Khuê — **ĐÃ LÀM (08/10, chưa commit)**:
  - Map vai CHỈ từ CRM (`mapVaiCrm`, `apps/api/src/common/utils/core.ts`): admin → ADMIN + THIEN_KHUE; manager → QUAN_LY + MENTOR; nhóm SALE/CSKH/THUC_TAP/CTV/KOL/KOC/DOI_TAC → vai cùng tên; KHO / KE_TOAN / KHONG → không vai. Đã gỡ map theo chức danh; test `map-vai-crm` + `dong-bo-vai-crm` viết lại theo nhóm quyền.
  - **Bỏ tự đăng ký / tự xin vai**: xoá `POST /ho-so/dang-ky` (tạo user Auth bằng service-role), `POST /ho-so/toi/dang-ky-vai`, `POST|GET /ho-so/toi/de-xuat-chuyen-vai`, `POST|GET /ho-so/:id/de-xuat-chuyen-vai`, `POST /mang-luoi/mentor/de-xuat-chuyen-vai`; xoá code chết đi kèm (DTO, `GioiHanTanSuat`, `VAI_DANG_KY`, `VAI_CHUYEN_TU_THUC_TAP`, `SupabaseAdminService.taoNguoiDung/xoaNguoiDung`, `VaiService.deXuatChuyenVai/deXuatCuaHoSo/apDungDeXuatChuyenVai`, repo tương ứng, `goi_y_dang_ky` của form liên hệ, `DanhGiaTts.de_xuat_dang_mo`, contracts `DeXuatChuyenVai`).
  - Web: /dang-ky là form liên hệ; trang Tài khoản bỏ thẻ "Đăng ký thêm vai trò" + "Đề xuất chuyển vai", thêm dòng "Vai trò do CRM cấp — liên hệ quản lý để đổi."; trang Thực tập (mentor) bỏ nút + hộp thoại đề xuất chuyển vai; form liên hệ bỏ nút "Tạo tài khoản"; bàn phê duyệt chỉ còn lập CAP_QUYEN_SKU từ hồ sơ (bỏ CHUYEN_VAI).
  - Bàn phê duyệt: lập `CHUYEN_VAI` → 400; enum giữ trong Prisma (dòng cũ, nhật ký AP_DUNG_CHUYEN_VAI). Code áp dụng `CHUYEN_VAI` ở `quan-tri-ap-dung.service.ts` (`chuanBiChuyenVai` / `apDungChuyenVai`) **để lại**: đề xuất cũ còn chờ duyệt bị chặn 400 lúc duyệt (mọi vai trừ KHACH là vai CRM) → admin nên Từ chối các đề xuất cũ đó.
  - `POST /ho-so/:id/vai` (cấp tay) còn nhưng chỉ nhận KHACH (mọi vai khác 400 "Vai lấy từ CRM").
  - Giữ trạng thái học (DANG_HOC → HOAT_DONG) bên Thiên Khuê.
  - Kiểm: typecheck contracts / api / web xanh, api 459 test xanh (37 suite) — sau khi gỡ TTS→CTV: 453 test, `pnpm --filter web build` xanh.
- **Đã quyết & đã gỡ (08/10, chưa commit)**: người dùng quyết "thực tập là thực tập, cộng tác viên là cộng tác viên" → bỏ hẳn cơ chế **TTS học đạt khoá CTV → tự thêm vai CTV**: xoá `apps/api/src/jobs/tts-len-ctv.job.ts` (+ đăng ký trong `ho-so.module.ts`, env `TTS_LEN_CTV_PHUT`), POST `/quan-tri/thuc-tap/xet-len-ctv`, `VaiService.xetTtsLenCtv/xetTtsLenCtvAnToan/quetTtsLenCtv`, `canXetTtsLenCtv`, lời gọi trong GET `/ho-so/toi` và checklist kích hoạt, `DieuKienHocService.coKhoaNghiepVu`, repo `layHoSoKemVai/dsVaiTheoDs/dsTtsChuaCoCtv/coKhoaNghiepVu`, test tương ứng. Không còn thông báo "trở thành CTV". Vai CTV đã tự thêm trước đây (nguon HE_THONG, nhật ký `TU_DONG_THEM_VAI_CTV`) **không đụng** — quản lý tự dọn. Lưu ý: đồng bộ vai CRM (`keHoachDongBoVaiCrm`) chỉ đóng dòng có nguon CRM / CRM_DONG_BO, nên dòng CTV nguon HE_THONG **không** tự mất khi gỡ ở CRM — phải kết thúc tay ở Thiên Khuê (PATCH trạng thái vai → KET_THUC) hoặc xoá dòng trong DB.
- Vai đã gán tay cho admin.local (nguon QUAN_TRI, để xem giao diện) — dọn hoặc giữ tuỳ người dùng.
- `SupabaseAdminService` giờ chỉ còn `layNguoiDung` (không ai gọi) — có thể xoá hẳn nếu không cần.

## Việc chờ người dùng / để sau

- Tích hợp chiều ngược: CRM hiển thị dữ liệu Thiên Khuê (người đã học đạt mã nào, hạng thẻ khách, hoa hồng) — chưa chốt phạm vi.
- Hoa hồng khi khách trả MỘT PHẦN đơn: có trừ theo tỷ lệ không? Bỏ route duyệt voucher trực tiếp?
- Tổng quan làm việc còn trống — đề xuất bảng điều khiển trong ngày.
- 14 lỗi mức vừa (`docs/LOI-CAN-SUA.md`). Dữ liệu giữ chỗ `[...]` trên trang chủ / VIP / Đào tạo.
- Commit + push cả 4 repo khi người dùng bảo.

## Chạy local

- Supabase CRM: `cd D:\intern\CRM_Lyno-\local-integration && npx supabase@2.118.0 start --workdir .`
- CRM: `cd D:\intern\CRM_Lyno- && node apps/dev.mjs` (api 3220, web 3230, form 3250) — sau khi pull code mới phải khởi động lại.
- Thiên Khuê: `cd D:\intern\Thien-Khue-System && pnpm --filter api dev` (3310) và `pnpm --filter web build && pnpm --filter web start` (3300; chế độ dev rất chậm).
- Sales Training: `docker start lyno-sales-training-db` rồi `cd D:\intern\lyno-sales-training && corepack pnpm dev` (3020; thử không tốn AI: AI_MODE=du_phong).
- Tài khoản: mật khẩu chung `LynoLocal@2026` — admin.local (đủ mọi vai, để xem giao diện), manager.sales, employee.sales01 (Sale hoạt động), employee.sales02 (Sale đang học, dùng cho E2E luyện AI), employee.cskh01, qa-ctv-47098752@thienkhue.test.
