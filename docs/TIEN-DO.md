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
- Thiên Khuê (CHƯA làm — làm sau khi agent duyet-gon xong):
  - Map vai CHỈ từ CRM: admin → ADMIN + THIEN_KHUE; manager → QUAN_LY + MENTOR; nhóm SALE/CSKH/THUC_TAP/CTV/KOL/KOC/DOI_TAC → vai cùng tên. KHO / KE_TOAN → không vai.
  - **Gỡ** phần agent "vai-crm" đã thêm: map theo chức danh (regex CTV / marketing → KOC) trong `apps/api/src/common/utils/core.ts`.
  - **Bỏ tự đăng ký** (người dùng chốt): trang /dang-ky thành form gửi liên hệ; tài khoản do admin tạo trong CRM.
  - Bỏ đề xuất CHUYEN_VAI (đổi vai = sửa CRM). Bàn phê duyệt chỉ còn tiền / quà-voucher / chính sách.
  - Giữ trạng thái học (DANG_HOC → HOAT_DONG) bên Thiên Khuê — đó là chuyện học, không phải role.
  - Vai đã gán tay cho admin.local (nguon QUAN_TRI, để xem giao diện) — dọn hoặc giữ tuỳ người dùng.

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
