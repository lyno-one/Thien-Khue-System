# Lỗi cần sửa — rà soát 07/10/2026

Nguồn: 2 agent rà soát độc lập (bảo mật & phân quyền; nghiệp vụ so với README) sau bước tích hợp. **Chưa sửa** — người dùng chọn rà vừa phải, sửa sau. Kiểm lại từng mục là lỗi thật trước khi sửa.

Tổng: 30 — nghiêm trọng 3, cao 13, vừa 14.

## Nghiêm trọng

### 1. `apps/api/src/modules/ho-so/ho-so.service.ts (capNhatCuaToi, dangKy) + apps/api/src/modules/khach-doi-tac/hang-thanh-vien.service.ts (layHangCuaToi), uu-dai.service.ts (layUuDaiCuaToi), kh-hanh-phuc.service.ts (sdtCuaToi, traLoi, doiDongYHinh, guiPhanHoi)`

SĐT trong hồ sơ do người dùng tự khai và không được xác minh. Hệ thống chỉ chặn trùng với ho_so khác, không kiểm với public.khach_hang và không có OTP. Mọi API /khach-doi-tac/toi/* lại coi nd.hoSo.sdt là danh tính khách CRM. Vì vậy ai cũng có thể tự đăng ký KHACH công khai (hoặc PATCH /api/ho-so/toi) với SĐT của một khách thật chưa có tài khoản Thiên Khuê. Sau đó người này: (1) xem được hạng, tổng mua, 20 đơn gần nhất (mã đơn, tiền, trạng thái) và danh sách ưu đãi đã cấp kèm ma_voucher, nên dùng được voucher của người khác; (2) trả lời lời mời KH hạnh phúc thay khách, bật 'đồng ý dùng hình', gửi phản hồi mẫu thử dưới tên khách; (3) nhận thông báo cấp ưu đãi gửi cho khách.

**Cách sửa:** Chỉ dùng SĐT đã xác minh làm danh tính khách. Xác minh bằng OTP SMS (Supabase phone OTP / verifyOtp) rồi lưu cờ sdt_da_xac_minh (+ thời điểm). layHangCuaToi, layUuDaiCuaToi và mọi hàm của kh-hanh-phuc trả rỗng hoặc 403 khi chưa xác minh. Khi PATCH đổi sdt thì reset cờ xác minh. Ở dangKy không tin sdt nhập cho tới khi có OTP.

**Trạng thái:** đã sửa — thêm `ho_so.sdt_xac_minh_luc` + `sdt_xac_minh_boi_id` (migration `20261007140000_sdt_xac_minh`, chỉ schema thien_khue: CHECK đã xác minh phải có SĐT, unique một phần `ho_so(sdt_chuan) WHERE sdt_xac_minh_luc IS NOT NULL`, trigger tự xoá xác minh khi `sdt_chuan` đổi bằng bất kỳ đường nào; schema public không đổi). Mọi API `/khach-doi-tac/toi/*` (hạng + đơn gần đây, ưu đãi, KH hạnh phúc: xem / trả lời / đồng ý hình / góp ý) đọc SĐT + cờ xác minh từ DB qua `laySdtKhachDaXacMinh` (`khach-doi-tac/sdt-khach.ts`): chưa có SĐT → rỗng, có SĐT chưa xác minh → 403 mã `SDT_CHUA_XAC_MINH` kèm câu hướng dẫn liên hệ CSKH. Đăng ký / PATCH `/ho-so/toi` đổi SĐT → chưa xác minh (ghi nhật ký `bo_xac_minh_sdt`); trùng SĐT chỉ chặn khi số đã xác minh cho hồ sơ khác (kẻ khai trước không chiếm được số của khách thật). Thông báo cấp ưu đãi / lời mời KH hạnh phúc chỉ gửi hồ sơ đã xác minh. Dữ liệu trả cho khách bỏ `id` đơn CRM, người cấp / lý do / đơn CRM của cấp phát, ghi chú nội bộ + người mời của lời mời. Xác minh tay (chưa có SMS): `GET /ho-so/xac-minh-sdt?sdt=` (CSKH / QUAN_LY, email che bớt), `POST /ho-so/:id/xac-minh-sdt` {sdt vừa gọi, ghi_chu} — không tự xác minh cho mình, số phải khớp số hiện tại, ghi nhật ký `XAC_MINH_SDT`; `POST /ho-so/:id/huy-xac-minh-sdt` (QUAN_LY, ghi lý do). Gắn OTP sau: gọi `XacMinhSdtService.apXacMinh(hoSoId, sdtChuan, { cach: "OTP", nguoiXacMinhId: null })`. Web: trang thành viên hiện hướng dẫn khi chưa xác minh, trang tài khoản hiện nhãn đã / chưa xác minh, tab Hạng thẻ (quản lý thành viên) có khối xác minh SĐT. Test: `test/khach-doi-tac/sdt-xac-minh-thien-khue.spec.ts`, `test/ho-so/xac-minh-sdt.spec.ts`.

### 2. `apps/api/src/modules/quan-tri/luat-duyet.ts (kiemChuyenVai) + apps/api/src/modules/quan-tri/ap-dung-de-xuat.service.ts (chuanBiChuyenVai / apDungChuyenVai)`

Có thể kích hoạt vai phải học mà chưa học đạt. kiemChuyenVai cho chuyển TAM_DUNG → HOAT_DONG mà không kiểm điều kiện học, vì giả định vai TAM_DUNG là vai đã từng đạt. Nhưng vai.service.doiTrangThai (luat-vai.kiemChuyenTrangThai) và chính kiemChuyenVai đều cho DANG_HOC → TAM_DUNG. Vì vậy Quản lý chỉ cần chuyển SALE/CTV đang học sang TAM_DUNG, rồi lập đề xuất CHUYEN_VAI {trang_thai_moi: HOAT_DONG}. Khi ADMIN duyệt, vai thành HOAT_DONG dù chưa có bài thi ≥90% và chưa có bài thực hành được duyệt. Đường vai.service đã chặn chỗ này bằng dieuKien.kiem, còn đường đề xuất ở quan-tri thì không.

**Cách sửa:** Trong kiemChuyenVai, chỉ cho TAM_DUNG → HOAT_DONG khi lịch sử vai (lich_su_vai_tro) đã từng có HOAT_DONG. Ngoài ra, trong apDungChuyenVai và chuanBiChuyenVai, với vai phải học chuyển sang HOAT_DONG thì gọi lại DieuKienHocService.kiem / tinhTienDo (cùng luật với XetDatService) và từ chối nếu chưa đạt. Có thể cấm hẳn DANG_HOC → TAM_DUNG, hoặc lưu cờ 'da_tung_hoat_dong'.

**Trạng thái:** đã sửa — `ApDungDeXuatService.kiemHocDat` gọi `DieuKienHocService.kiem` (cùng luật XetDatService / tinhTienDo; QuanTriModule import HoSoModule) mỗi khi CHUYEN_VAI đưa vai phải học (SALE, CSKH, CTV, THUC_TAP, KOL, KOC) sang HOAT_DONG, kể cả từ TAM_DUNG: kiểm cả lúc lập (`chuanBiChuyenVai`) và lúc duyệt trong transaction (`apDungChuyenVai`), chưa đạt → 400 kèm danh sách còn thiếu; thiếu service → fail-closed. Đường DANG_HOC → TAM_DUNG → HOAT_DONG không còn lách được. Test: `test/quan-tri/sua-loi-duyet.spec.ts`.

### 3. `apps/api/src/modules/ho-so/ho-so.service.ts (capNhatCuaToi, dangKy) + apps/api/src/modules/khach-doi-tac/hang-thanh-vien.service.ts (layHangCuaToi) + uu-dai.service.ts (layUuDaiCuaToi) + kh-hanh-phuc.service.ts (sdtCuaToi)`

Hạng thành viên, đơn gần đây, ưu đãi đã cấp và lời mời KH hạnh phúc của khách đều lấy theo SĐT người dùng tự khai (ho_so.sdt), và SĐT này không được xác minh (không OTP). Người dùng đăng ký hoặc PATCH /ho-so/toi với SĐT của một khách VIP thật (chưa có hồ sơ nào dùng) là thấy ngay tổng mua, mã đơn, số tiền của từng đơn và các voucher/quà đã cấp cho SĐT đó. Họ cũng tự 'tham gia' chương trình KH hạnh phúc, tự bật đồng ý dùng hình và gửi góp ý thay khách đó. Như vậy dữ liệu khách cá nhân bị lộ và quyền lợi bị chiếm.

**Cách sửa:** Xác minh SĐT trước khi gắn với dữ liệu CRM: OTP qua Supabase Auth phone, hoặc nhân viên xác nhận. Lưu cờ sdt_da_xac_minh, và chỉ khi cờ bật mới tính hạng, trả đơn, ưu đãi, KH hạnh phúc. Đổi SĐT thì reset cờ.

**Trạng thái:** đã sửa cùng mục 1 — hạng, đơn gần đây, ưu đãi đã cấp, KH hạnh phúc chỉ trả / cho thao tác theo SĐT đã được nhân viên xác minh (sau này OTP); đổi SĐT tự xoá xác minh (service + trigger DB).

## Cao

### 4. `apps/api/src/core/auth/nguoi-dung.service.ts (layTuToken / taoLanDau) + apps/api/src/core/auth/xac-thuc-token.service.ts`

Vai lấy từ CRM chỉ được map MỘT lần, lúc tạo hồ sơ lần đầu, và không bao giờ đồng bộ lại. CRM cho nhân sự nghỉ bằng public.users.active=false nhưng tài khoản Auth vẫn đăng nhập được (CRM tự chặn ở auth.service). Ở Thiên Khuê, một admin hay manager đã nghỉ hoặc bị hạ quyền vẫn giữ ADMIN / QUAN_LY HOAT_DONG mãi mãi: duyệt đề xuất, xem toàn bộ khách CRM, phân bổ khách… Ngoài ra token chỉ được verify cục bộ, không kiểm phiên còn sống (CRM có kiểm), nên đăng xuất, đổi mật khẩu hay ban user không thu hồi được quyền cho tới khi token hết hạn.

**Cách sửa:** Trong layTuToken, với hồ sơ có crm_user_id, đọc lại layNhanSuCrm (cache khoảng 1–5 phút). Nếu active=false thì bỏ các vai nguồn CRM khỏi nd.vai (hoặc chuyển chúng sang KET_THUC kèm lich_su_vai_tro). Nếu role / nhom_quyen đổi thì đồng bộ vai tương ứng. Cân nhắc kiểm session_id còn sống (auth.sessions) giống CRM auth.repository.

**Trạng thái:** đã sửa — `NguoiDungService.layTuToken` đối chiếu lại `layNhanSuCrm` mỗi hồ sơ (cache 60 s, gộp request đồng thời, lỗi đọc CRM thì giữ vai và thử lại). Hàm thuần `keHoachDongBoVaiCrm` (map-vai-crm.ts): nhân sự bị khoá / bị xoá → ADMIN/QUAN_LY/SALE/CSKH đang hiệu lực chuyển `TAM_DUNG`; đổi phòng / đổi role → vai nguồn CRM cũ `KET_THUC` + cấp vai mới (SALE/CSKH ở `DANG_HOC`); mở khoá chỉ khôi phục vai do đồng bộ tạm dừng (nguồn `CRM_DONG_BO`), không mở lại vai con người đã tạm dừng / kết thúc; không đụng vai Thiên Khuê cấp (CTV, KOC…). Ghi `lich_su_vai_tro` + nhật ký `DONG_BO_VAI_CRM`. Test: `test/core/dong-bo-vai-crm.spec.ts`. Thêm (kiểm tổng, mục 28/29): phân bổ khách tự động (`PhanBoService.layUngVien`) bỏ qua nhân sự CRM đã bị khoá / xoá (`CrmDocService.locNhanSuKhongConLam`) dù vai chưa kịp đồng bộ vì họ chưa đăng nhập lại. Chưa làm: kiểm `session_id` còn sống (auth.sessions); tự xét lại kích hoạt vai khi CRM mở khoá (hiện SALE/CSKH về DANG_HOC, xét lại khi có thao tác học).

### 5. `apps/api/src/modules/khach-doi-tac/khach-doi-tac.controller.ts (PUT hang/cau-hinh/:hang, POST voucher/:id/duyet, POST qua-tang/:id/duyet) + hang-thanh-vien.service.ts (capNhatCauHinh) + uu-dai.service.ts (duyetVoucher)`

Các route này đánh @Vai("THIEN_KHUE"), nhưng VaiGuard luôn cho ADMIN qua (VAI_TOI_CAO), và service không kiểm lại. Hệ quả: ADMIN duyệt được voucher / quà và tự đổi chính sách hạng (ngưỡng, % giảm), trái luat-duyet.ts ('ADMIN không duyệt thay CEO'; DUYET_VOUCHER, DUYET_QUA_TANG, DOI_CHINH_SACH chỉ THIEN_KHUE). PUT hang/cau-hinh còn cho MỘT người đổi chính sách ngay, bỏ qua maker-checker DOI_CHINH_SACH. Voucher chỉ có người tạo và người duyệt, không có bước thẩm định, song song với đường DUYET_VOUCHER 3 người ở quan-tri.

**Cách sửa:** Trong service, kiểm tường minh nd.vai.includes("THIEN_KHUE") (hoặc thêm decorator vai không áp quyền tối cao). Bỏ PUT hang/cau-hinh trực tiếp: tạo de_xuat_duyet DOI_CHINH_SACH. Voucher bắt buộc qua thẩm định (nguoi_tham_dinh_id khác người tạo) trước khi duyệt, hoặc chỉ cho duyệt qua bàn phê duyệt.

**Trạng thái:** đã sửa — `duyetQua`, `duyetVoucher`, `capNhatCauHinh` kiểm vai `THIEN_KHUE` thật trong service (`kiemThienKhueThat`, không dùng `coVai`; VaiGuard / VAI_TOI_CAO toàn cục không đổi): ADMIN nhận 403. `PUT hang/cau-hinh/:hang` không còn đổi ngưỡng tích luỹ / % giảm (gửi giá trị khác hiện hành → 400, hướng dẫn lập đề xuất DOI_CHINH_SACH NGUONG_HANG ở Bàn phê duyệt — chỉ `apDungChinhSach` ghi hai cột này); chỉ còn sửa tên, quyền lợi thêm, bật / tắt hạng. Web: nút Duyệt / Sửa chỉ hiện với THIEN_KHUE thật, hộp sửa hạng bỏ ô ngưỡng / % giảm. Chưa làm: bước thẩm định voucher trên đường duyệt trực tiếp `POST voucher/:id/duyet` (vẫn người tạo ≠ người duyệt; đường 3 người đầy đủ là đề xuất DUYET_VOUCHER ở bàn phê duyệt). Test: `test/khach-doi-tac/sdt-xac-minh-thien-khue.spec.ts`.

### 6. `apps/api/src/modules/mang-luoi/ghi-nhan-don.service.ts (xacMinh) + mang-luoi-quan-ly.controller.ts (POST ghi-nhan/:id/xac-minh)`

Một QUAN_LY một mình chọn người bán cho đơn CHO_XAC_MINH và tạo hoa_hong ngay trong cùng transaction. Đây là quyết định về dòng tiền nhưng không có người kiểm / người duyệt, trong khi luat-duyet.ts quy định XAC_MINH_DON phải qua 3 người và người duyệt là ADMIN / THIEN_KHUE. Hai QUAN_LY thông đồng (hoặc một QUAN_LY với người được hưởng) có thể chuyển hoa hồng của bất kỳ đơn tranh chấp nào.

**Cách sửa:** Route xac-minh chỉ tạo de_xuat_duyet loại XAC_MINH_DON (CHO_KIEM) chứa lựa chọn và lý do. Chỉ ApDungDeXuatService.apDungXacMinhDon mới đổi ghi_nhan_don và tạo hoa_hong sau khi DA_DUYET.

**Trạng thái:** đã sửa cùng mục 16 — `POST /mang-luoi/quan-ly/ghi-nhan/:id/xac-minh` chỉ lập `de_xuat_duyet` XAC_MINH_DON (CHO_KIEM, du_lieu cùng dạng `chuanBiXacMinhDon`, chặn đề xuất trùng đang mở) và báo người kiểm; không đổi `ghi_nhan_don`, không tạo hoa hồng. Ghi HOP_LE chỉ ở `apDungXacMinhDon` khi DA_DUYET, hoa hồng tạo ở `sauKhiDuyet` (job đồng bộ tạo bù). Test: `test/mang-luoi/sua-loi-duyet.spec.ts`, `ghi-nhan-don.service.spec.ts`.

### 7. `apps/api/src/modules/mang-luoi/ghi-nhan-don.service.ts (ghiNhanTheoMaDon, xuLyDon)`

Khi người gọi là QUAN_LY / ADMIN / THIEN_KHUE, buocXacMinh=false. Mã giới thiệu nhập tay vào một đơn CRM không có người chốt thuộc Thiên Khuê (đơn website, hoặc đơn do nhân sự CRM không có vai SALE/CSKH tạo) sẽ thành HOP_LE và tạo hoa hồng ngay cho chủ mã, không ai khác kiểm. QUAN_LY đồng thời là CTV có thể gắn mã của chính mình, hoặc của người quen, vào đơn bất kỳ để nhận hoa hồng.

**Cách sửa:** Mọi mã giới thiệu nhập tay sau khi đơn đã tạo đều phải vào CHO_XAC_MINH, bất kể vai người nhập. Chặn khi chủ mã = nd.id. Người xác minh sau đó phải khác người nhập.

**Trạng thái:** đã sửa — `ghiNhanTheoMaDon`: mã giới thiệu nhập tay luôn vào CHO_XAC_MINH bất kể vai người nhập (bỏ ngoại lệ QUAN_LY/ADMIN/THIEN_KHUE); chủ mã = người nhập → 403. Người nhập được ghi vào nhật ký `GHI_NHAN_DON.du_lieu.nguoi_nhap_ma` và tính là người liên quan (`layNguoiNhapMa`): không lập đề xuất xác minh (mang-luoi), không kiểm / duyệt (`nguoiLienQuan` của quan-tri). `DeXuatService.tao` dùng đủ người liên quan (gồm chủ mã, người nhập mã). Test: `test/mang-luoi/sua-loi-duyet.spec.ts`, `test/quan-tri/ap-dung-de-xuat.spec.ts`.

### 8. `apps/api/src/modules/ban-hang/don.service.ts (taoDon bước 3–4) + khach.service.ts (damBaoDuocBan, chiTiet)`

Sale tự nhận được bất kỳ khách CRM nào đang không có người phụ trách. damBaoDuocBan ghi giao_khach về mình TRƯỚC khi gọi CRM tạo đơn và không hoàn tác khi CRM từ chối (sai size, hết hàng, lỗi mạng). Hàm này cũng không kiểm SĐT đã là khách cũ trên CRM hay chưa. Chỉ cần quyền một SKU, Sale gửi POST /ban-hang/don với SĐT bất kỳ (cố ý cho đơn lỗi) là thành người phụ trách. Sau đó GET /ban-hang/khach/:sdt trả địa chỉ, toàn bộ đơn và lịch sử chăm sóc của khách. Điều này phá luật 'Sale / CSKH chỉ xem khách được giao'.

**Cách sửa:** Chỉ ghi giao_khach SAU khi CRM tạo đơn thành công, hoặc tạo trước rồi xoá / kết thúc trong catch khi CRM lỗi. Nếu SĐT đã có trong public.khach_hang hoặc có đơn cũ mà chưa giao cho ai thì không cho tự nhận: trả 403 và báo QUAN_LY phân bổ. Tự nhận chỉ áp cho SĐT chưa tồn tại trên CRM.

**Trạng thái:** đã sửa — `damBaoDuocBan` chỉ kiểm, không ghi gì. Sale/CSKH chỉ tự nhận được khách MỚI hoàn toàn: SĐT chưa có trong `public.khach_hang`, chưa có đơn CRM, chưa từng có `giao_khach` hay lead. Khách đã có mà chưa ai phụ trách, hoặc đang do người khác phụ trách, trả 403 "Khách chưa được giao cho bạn — báo quản lý phân bổ…" (không lộ ai phụ trách). `giao_khach` chỉ được ghi qua `KhachService.tiepNhanSauTaoDon` SAU khi CRM tạo đơn thành công. CRM lỗi thì không ai nhận khách. Nếu ghi không được hoặc có người khác vừa nhận khách thì trả `canh_bao` để đối soát. `chiTiet` vẫn 404 với khách chưa giao. Sửa thêm câu hướng dẫn trên form tạo đơn. Test: `apps/api/test/ban-hang/khach-va-don.spec.ts`.

### 9. `apps/api/src/modules/dao-tao/dao-tao.dto.ts (TaoBaiKiemTraDto / SuaBaiKiemTraDto nguong_dat @Min(0)) + quan-tri-noi-dung.service.ts + tinh-tien-do.ts + quan-tri-dao-tao.controller.ts`

Một QUAN_LY tự mở được cổng 'học trước khi bán', không qua maker-checker: hạ nguong_dat xuống 0, tắt bài thi / bỏ bat_buoc, đặt can_thuc_hanh=false, hoặc tạo khoá SAN_PHAM không có bài thi. tinhTienDo coi khoá chỉ có bài học là hoàn thành, nên đọc bài xong là được cấp quyền SKU và vai DANG_HOC tự lên HOAT_DONG. Ngoài ra QUAN_LY xem được đáp án qua GET /dao-tao/quan-tri/bai-kiem-tra/:id rồi tự thi. Ví dụ manager.sales vừa là QUAN_LY vừa là SALE DANG_HOC.

**Cách sửa:** Ép nguong_dat >= 90 ở DTO và service. tinhTienDo / XetDatService yêu cầu khoá NEN_TANG, NGHIEP_VU, SAN_PHAM có ít nhất một bài kiểm tra bắt buộc đang bật mới tính hoàn thành. Thay đổi ngưỡng / tắt bài thi / bỏ thực hành của khoá đang dùng phải qua de_xuat_duyet. Không cho người đã xem / sửa đề (nhat_ky SUA_BAI_KIEM_TRA, xem đề) dùng lượt thi đó để tự đạt.

**Trạng thái:** đã sửa — ngưỡng ≥ 90 ở DTO (`@Min(90)`), service (`kiemNguong`), chấm điểm (`datNguong` kẹp tối thiểu 90) và DB (migration `20261007140100_khoa_nguong_90`, CHECK 90–100). `tinhTienDo`: khoá không có bài kiểm tra bắt buộc đang bật thì không bao giờ hoàn thành (fail-safe). Nới cổng học (tắt đề / khoá bắt buộc, bỏ `bat_buoc`, bỏ `can_thuc_hanh`, bỏ vai khỏi khoá bắt buộc, tạo khoá NGHIEP_VU không thực hành) chỉ `THIEN_KHUE` thật — QUAN_LY / ADMIN nhận 403 kèm hướng dẫn gửi đề xuất. Người đang học khoá (vai phải học trong `vai_ap_dung`, chưa KET_THUC) xem đề bị ẩn đáp án + giải thích, không được tạo / sửa đề, câu hỏi của khoá đó. Test: `test/dao-tao/nguong-noi-cong.spec.ts`.

### 10. `apps/api/src/core/crm/crm-doc.service.ts (DIEU_KIEN_DON_HOP_LE, tongMuaHopLe…) + apps/api/src/modules/mang-luoi/quy-tac.ts (donBiHuy / chuyenTrangThaiHoaHong)`

Hàng trả qua luồng đổi trả của CRM không được trừ khỏi tích luỹ và hoa hồng. Từ migration 067/068 (đang chạy), CRM xử lý trả hàng bằng yeu_cau_doi_tra loại 'TRA' (HOAN_TAT, có tien_hoan trong doi_tra_tai_chinh), còn đơn gốc vẫn ở 'giao_thanh_cong'. Thiên Khuê chỉ loại đơn có trang_thai 'hoan'/'huy', nên đơn đã trả tiền vẫn được tính đủ tong_tien vào hạng 50tr/100tr, vào lần đếm 10 đơn, và hoa hồng vẫn DU_DIEU_KIEN. Điều này trái README: 'không tính đơn hoàn/trả, tự tính lại hạng'.

**Cách sửa:** Trong CrmDocService (chỗ duy nhất được SQL vào public), trừ phần tiền đã hoàn: left join yeu_cau_doi_tra (loai_yeu_cau='TRA', trang_thai='HOAN_TAT') + doi_tra_tai_chinh loại HOAN_TIEN, lấy tong_tien − tien_hoan; trả toàn bộ thì không đếm lần mua. Mang-luoi khi đồng bộ cũng đọc yêu cầu TRA đã hoàn tiền để chuyển hoa hồng sang BI_TRU, hoặc ghi điều chỉnh âm theo phần trả.

**Trạng thái:** đã sửa — CrmDocService join lateral yêu cầu TRA đã chấp nhận (CHO_HOAN_TIEN / HOAN_TAT) + doi_tra_dong + snapshot tiền mới nhất (không UOC_TINH): đơn trả cả đơn (số lượng chấp nhận ≥ số lượng đơn, hoặc tiền trả ≥ tong_tien) bị loại khỏi DIEU_KIEN_DON_HOP_LE (không tích luỹ, không đếm lần mua); trả một phần thì tích luỹ = tong_tien − tiền trả; yêu cầu DOI không ảnh hưởng. Mọi truy vấn đơn trả kèm `da_tra_hang` / `tien_tra_hang`; quy-tac donBiHuy / trangThaiHoaHongBanDau / chuyenTrangThaiHoaHong / quyetDinhGhiNhan nhận cả DonCrm (vẫn nhận chuỗi như cũ) và coi đơn đã trả như hoàn → BI_TRU (DA_TRA thì ghi điều chỉnh âm). Đã nối (kiểm tổng): ghi-nhan-don.service.ts truyền cả `don` vào luật quy-tac nên hoa hồng đơn trả hàng chuyển BI_TRU; lý do BI_HUY dùng `lyDoDonRot`; `hang-thanh-vien.ts` `laDonHopLe` loại đơn `da_tra_hang`, `tinhTichLuy` trừ `tien_tra_hang` (khớp `tongMuaHopLe`). Còn thiếu: hoa hồng của đơn trả MỘT PHẦN chưa điều chỉnh theo `tien_tra_hang`. Test: test/core/crm-doc-tra-hang.spec.ts, test/mang-luoi/tra-hang-doi-tra.spec.ts.

### 11. `apps/api/src/modules/dao-tao/dao-tao.dto.ts (TaoBaiKiemTraDto/SuaBaiKiemTraDto: nguong_dat @Min(0)) + prisma/migrations/20261007000000_khoi_tao/migration.sql (CHECK nguong_dat BETWEEN 0 AND 100) + quan-tri-noi-dung.service.ts`

Ngưỡng 90% không bị khoá. QUAN_LY (quan-tri-dao-tao.controller @Vai('QUAN_LY')) tự mình sửa được nguong_dat xuống 0–89 qua PATCH bai-kiem-tra, và DB cũng chỉ CHECK 0–100. Người này còn đặt được bat_buoc=false hoặc tắt bài kiểm tra (DELETE = bat:false) và can_thuc_hanh=false ở khoá. Khi đó tinhTienDo coi khoá hoàn thành chỉ nhờ học xong bài, XetDatService tự kích hoạt vai và cấp quyền SKU mà không có bài thi ≥90% hay bài thực hành được duyệt. README coi đây là luật cứng và là quyết định cấp quyền bán cần tách người.

**Cách sửa:** Đặt @Min(90) cho nguong_dat ở cả hai DTO và đổi CHECK DB thành nguong_dat BETWEEN 90 AND 100 (migration mới, schema thien_khue). Trong tinhTienDo và khoaBatBuocCuaVai, khoá NEN_TANG/NGHIEP_VU/SAN_PHAM nào không có bài kiểm tra bắt buộc đang bật thì coi là chưa đạt (fail-safe). Khoá NGHIEP_VU phải bắt buộc can_thuc_hanh. Việc tắt đề, hạ bat_buoc hay tắt thực hành nên đi qua đề xuất DOI_CHINH_SACH.

**Trạng thái:** đã sửa cùng mục 9 — `@Min(90)` ở cả hai DTO, CHECK DB `nguong_dat BETWEEN 90 AND 100` (đã áp, schema public không đổi), fail-safe trong `tinhTienDo` (áp cho cả `khoaBatBuocCuaVai` / XetDat / dieu-kien-hoc vì cùng dùng hàm này), thao tác nới cổng chỉ THIEN_KHUE. Khoá NGHIEP_VU tạo mới mặc định `can_thuc_hanh=true`. Chưa làm luồng đề xuất DOI_CHINH_SACH (module quan-tri) — hiện chặn cứng, chỉ Thiên Khuê tự làm.

### 12. `apps/api/src/modules/khach-doi-tac/khach-doi-tac.controller.ts (@Vai('THIEN_KHUE') ở PUT hang/cau-hinh/:hang, POST qua-tang/:id/duyet, POST voucher/:id/duyet) + hang-thanh-vien.service.ts capNhatCauHinh`

VaiGuard luôn cho ADMIN qua (VAI_TOI_CAO), nên ADMIN duyệt được quà/voucher và đổi ngưỡng hoặc % giảm của hạng thay Thiên Khuê, trái với luat-duyet.ts (DUYET_QUA_TANG, DUYET_VOUCHER, DOI_CHINH_SACH chỉ THIEN_KHUE). Ngoài ra, PUT hang/cau-hinh đổi chính sách hạng trực tiếp chỉ với một người, bỏ qua maker-checker DOI_CHINH_SACH/NGUONG_HANG đã có trong ap-dung-de-xuat.service.

**Cách sửa:** Trong các service duyetQua, duyetVoucher, capNhatCauHinh, kiểm rõ nd.vai.includes('THIEN_KHUE') (không dùng coVai). Bỏ PUT hang/cau-hinh hoặc đổi thành lập đề xuất DOI_CHINH_SACH (chinh_sach: NGUONG_HANG), để chỉ apDungChinhSach được ghi hang_thanh_vien_cau_hinh.

**Trạng thái:** đã sửa cùng mục 5 — kiểm `THIEN_KHUE` thật trong service, đổi ngưỡng / % giảm phải qua đề xuất DOI_CHINH_SACH.

### 13. `apps/api/src/modules/mang-luoi/hoa-hong.service.ts + apps/api/src/modules/quan-tri/ap-dung-de-xuat.service.ts (CHI_TRA_HOA_HONG chỉ ghi quyết định)`

Không có luồng nào chuyển hoa_hong sang DA_TRA. Đề xuất CHI_TRA_HOA_HONG được duyệt xong không đổi gì: không có khoản hoa hồng nào bị khoá hay đánh dấu đã trả. Hệ quả là cùng một tập hoa hồng DU_DIEU_KIEN có thể được đề xuất và duyệt chi trả lần nữa ở kỳ sau, tức trả hai lần. Nhánh 'đã trả rồi mới hoàn thì ghi điều chỉnh âm' (ghiDieuChinhTru khi DA_TRA) không bao giờ chạy. Ví còn tính tam_tinh = DU_DIEU_KIEN + tổng mọi dieu_chinh từ trước tới nay, nên điều chỉnh đã thanh toán vẫn bị cộng lại.

**Cách sửa:** Thêm handler CHI_TRA_HOA_HONG trong apDung, chạy trong transaction duyệt. Nó updateMany các hoa_hong có id trong du_lieu với điều kiện trang_thai='DU_DIEU_KIEN', đặt DA_TRA + tra_luc + de_xuat_duyet_id, và kiểm số dòng cập nhật đúng bằng số đã đề xuất (không thì rollback). Đánh dấu cả dieu_chinh_hoa_hong đã đưa vào kỳ trả (thêm cột ky_tra / da_tra) và tính tam_tinh chỉ từ các khoản chưa trả.

**Trạng thái:** đã sửa — CHI_TRA_HOA_HONG lập được từ bàn phê duyệt (form "Chi trả hoa hồng": kỳ YYYY-MM, tuỳ chọn một hồ sơ). `chuanBiChiTra` chốt danh sách: hoa_hong DU_DIEU_KIEN có kỳ ≤ kỳ trả + điều chỉnh chưa trả, loại khoản đã nằm trong đề xuất chi trả đang mở / đã duyệt; người có tổng âm để lại kỳ sau; người nhận vào `nguoi_nhan_ids` = người liên quan (không lập / kiểm / duyệt). `apDungChiTra` (trong transaction duyệt, chỉ THIEN_KHUE): `updateMany` DU_DIEU_KIEN → DA_TRA + `tra_luc` + `de_xuat_duyet_id`, số dòng lệch hoặc khoản đã thuộc đề xuất khác → 409 rollback; ghi nhật ký `AP_DUNG_CHI_TRA_HOA_HONG`, báo người nhận. Ví: `tam_tinh` = DU_DIEU_KIEN + điều chỉnh chưa nằm trong đề xuất chi trả đã duyệt. Khoá cứng ở DB (kiểm tổng, migration `20261007150000_chi_tra_dieu_chinh`, chỉ schema thien_khue): cột `dieu_chinh_hoa_hong.de_xuat_chi_tra_id` (backfill từ đề xuất đã duyệt) — `apDungChiTra` `updateMany` điều chỉnh có `de_xuat_chi_tra_id IS NULL`, lệch số dòng → 409 rollback; `chuanBiChiTra` / ví chỉ tính điều chỉnh chưa trả. Unique một phần `de_xuat_duyet(loai, doi_tuong, doi_tuong_id)` khi CHO_KIEM / CHO_DUYET cho XAC_MINH_DON, DUYET_QUA_TANG, DUYET_VOUCHER, CHI_TRA_HOA_HONG (chặn đề xuất trùng khi request đồng thời; P2002 → 409). Test: `test/quan-tri/sua-loi-duyet.spec.ts`, `test/mang-luoi/sua-loi-duyet.spec.ts`.

### 14. `apps/api/src/modules/mang-luoi/dong-bo-don.job.ts + apps/api/.env.example (MANG_LUOI_DONG_BO_PHUT=0)`

Job đồng bộ mặc định tắt. Đây là đường duy nhất chuyển hoa hồng từ CHO_DOI_SOAT sang DU_DIEU_KIEN khi giao thành công, chuyển sang BI_TRU khi đơn hoàn/huỷ, tạo hoa hồng bù và phát hiện đơn có [MGT:]. Khi tắt, đơn hoàn/huỷ trên CRM không bị trừ hoa hồng, và đơn giao xong cũng không bao giờ đủ điều kiện, trừ khi quản lý tự bấm POST dong-bo. Luật 'hoàn/huỷ trừ tích luỹ' của ví vì vậy không tự chạy.

**Cách sửa:** Đặt mặc định bật (ví dụ 15 phút nếu biến môi trường trống) và ghi rõ trong .env.example. Hoặc chạy job theo cron cố định, và chỉ tắt khi đặt rõ MANG_LUOI_DONG_BO_PHUT=0.

**Trạng thái:** đã sửa — job bật mặc định: biến trống / không đặt / không phải số = 10 phút, chỉ tắt khi đặt rõ `0` (log cảnh báo khi tắt); chạy lần đầu 30 giây sau khi API lên; khoá trong tiến trình (cờ riêng + `ghiNhan.dangChay`) nên không chạy chồng với lần trước hay lần bấm tay; lỗi chỉ ghi log. `.env.example` và `.env.local` đặt `MANG_LUOI_DONG_BO_PHUT=10` (server dev đang chạy cần khởi động lại mới nhận), KIEN-TRUC.md ghi rõ. Test: test/mang-luoi/dong-bo-don-job.spec.ts.

### 15. `apps/api/src/modules/mang-luoi/ghi-nhan-don.service.ts (capNhatTheoDon dòng 270–312, dongBo dòng 390–394)`

Khi đơn hoàn/huỷ, capNhatTheoDon đổi ghi_nhan_don sang BI_HUY trong một lệnh riêng, rồi mới chuyển hoa hồng sang BI_TRU (kèm điều chỉnh âm) trong một transaction khác. Nếu bước hai lỗi (DB, timeout, process chết), lần đồng bộ sau sẽ bỏ qua ghi nhận này vì truy vấn 'mo' chỉ lấy trang_thai in [HOP_LE, CHO_XAC_MINH, DA_DOI_SOAT]. Hoa hồng đó ở lại DU_DIEU_KIEN/DA_TRA mãi mãi và không bao giờ bị trừ.

**Cách sửa:** Gộp việc đổi ghi_nhan_don và đổi hoa_hong vào cùng một $transaction. Hoặc trong dongBo, lấy thêm các ghi nhận BI_HUY có hoa_hong.trang_thai khác BI_TRU (sửa điều kiện where: OR [trang_thai in (...), {trang_thai: BI_HUY, hoa_hong: {is: {trang_thai: {not: BI_TRU}}}}]).

**Trạng thái:** đã sửa — `capNhatTheoDon` đổi `ghi_nhan_don` → BI_HUY và `hoa_hong` → BI_TRU (+ điều chỉnh âm nếu DA_TRA) trong cùng một `$transaction`, vẫn `updateMany` có điều kiện trạng thái cũ (idempotent, chạy lại không trừ hai lần). `dongBo` quét thêm ghi nhận BI_HUY có hoa hồng chưa BI_TRU (dữ liệu cũ). Ghi nhận BI_HUY mà đơn vẫn sống thì không nâng hoa hồng lên DU_DIEU_KIEN. Truyền cả `don` (có `da_tra_hang`) vào luật quy-tac. Test: `test/mang-luoi/sua-loi-duyet.spec.ts` (transaction giả lập có rollback).

### 16. `apps/api/src/modules/mang-luoi/mang-luoi-quan-ly.controller.ts (POST ghi-nhan/:id/xac-minh, @Vai('QUAN_LY')) + ghi-nhan-don.service.ts xacMinh`

Ca trùng nguồn (mã giới thiệu khác người chốt) được một QUAN_LY xác minh trực tiếp. Chỉ một người quyết định ai nhận hoa hồng và hoa hồng được tạo ngay. Như vậy bỏ qua bàn phê duyệt, nơi luat-duyet đặt XAC_MINH_DON cho ADMIN/THIEN_KHUE với người đề xuất, người kiểm và người duyệt tách nhau. README yêu cầu bàn phê duyệt CEO/Thiên Khuê giải quyết ca trùng nguồn và tách người với quyết định về dòng tiền. Hai đường cùng tồn tại nên luật maker-checker vô hiệu.

**Cách sửa:** Bỏ quyết định trực tiếp. POST xac-minh của mang-luoi chỉ lập đề xuất XAC_MINH_DON (DeXuatService.tao), còn việc ghi HOP_LE và tạo hoa hồng chỉ chạy trong apDungXacMinhDon + sauKhiDuyet. Nếu vẫn giữ đường trực tiếp thì phải yêu cầu vai THIEN_KHUE và người duyệt khác người kiểm.

**Trạng thái:** đã sửa — bỏ quyết định trực tiếp: route xác minh của mang-luoi chỉ lập đề xuất XAC_MINH_DON; người đề xuất không được là người giới thiệu / người chốt / người bán hiện tại / người nhập mã; kiểm và duyệt ở bàn phê duyệt (3 người khác nhau, duyệt ADMIN / THIEN_KHUE, người liên quan bị loại). Màn "Điều hành mạng lưới" đổi nút thành "Gửi đề xuất" và câu báo tương ứng.

## Vừa

### 17. `apps/api/src/modules/dao-tao/kiem-tra.service.ts (batDau, nop) + hoc-vien.service.ts (chiTietKhoa, chiTietBai, danhDauBai) + prisma/seed.ts`

Có thể dò ra đáp án. Bài thi seed không giới hạn lượt (so_lan_toi_da null), hiện mọi câu (so_cau_hien null) và không giới hạn thời gian. Mỗi lần nộp trả diem / so_cau_dung, nên đổi từng đáp án qua mỗi lượt là suy ra được đáp án đúng. Khi đạt, toàn bộ đáp án và giải thích được trả về để chia sẻ. Thêm nữa, không có kiểm vai_ap_dung: bất kỳ tài khoản nào (kể cả KHACH tự đăng ký công khai) cũng đọc được mọi tài liệu nội bộ, thi mọi đề và được cấp quyen_sku.

**Cách sửa:** Đặt mặc định so_lan_toi_da kèm thời gian chờ giữa các lượt, dùng so_cau_hien < tổng câu để đề ngẫu nhiên. Khi trượt chỉ trả đạt / trượt (hoặc điểm làm tròn theo bậc). Kiểm vai (vai_ap_dung hoặc VAI_XEM_MOI_KHOA) trước khi trả bài học / đề thi / đánh dấu học xong. Không cấp quyen_sku cho hồ sơ không có vai phải học.

### 18. `apps/api/src/modules/ho-so/luat-vai.ts (VAI_CAP_CAO, kiemQuyenDoiVai) + vai.service.ts (themVai)`

Một QUAN_LY một mình cấp được vai MENTOR hoặc DOI_TAC cho người khác, và vai đó HOAT_DONG ngay. MENTOR là người chấm thực hành (thuc-hanh.service cham → xetDat cấp quyền SKU + kích hoạt vai). Vì vậy QUAN_LY A cấp MENTOR cho người quen B, B chấm đạt bài thực hành của A (hoặc người A muốn), làm vô hiệu luật 'không tự chấm'. DOI_TAC thì mở cổng đối tác và quyền đề xuất quà.

**Cách sửa:** Đưa MENTOR và DOI_TAC vào nhóm vai chỉ ADMIN / THIEN_KHUE cấp, hoặc bắt buộc qua de_xuat_duyet CHUYEN_VAI (3 người). Có thể chặn thêm việc MENTOR chấm bài của người đã cấp vai cho mình.

### 19. `apps/api/src/modules/ho-so/ho-so.controller.ts (@Vai("QUAN_LY","MENTOR") GET /ho-so, GET /ho-so/:id, /lich-su-vai) + vai.service.ts (danhSach, chiTiet)`

MENTOR (vai đào tạo) liệt kê, tìm kiếm được MỌI hồ sơ, gồm khách hàng KHACH và đối tác, kèm email, SĐT, ghi_chu, tìm được theo SĐT. Đây là lộ dữ liệu cá nhân khách cho người không phụ trách khách, trái KIEN-TRUC mục 7.

**Cách sửa:** Với người chỉ có MENTOR, lọc danh sách về hồ sơ có vai phải học (VAI_PHAI_HOC) và ẩn sdt / email. Danh sách đầy đủ chỉ dành cho QUAN_LY / ADMIN / THIEN_KHUE.

### 20. `apps/api/.env.example (DATABASE_URL=postgresql://postgres:postgres@...) + apps/api/src/core/prisma/prisma.service.ts`

Nest (Prisma + CrmDocService) kết nối DB chung bằng superuser postgres. Luật 'chỉ SELECT vào public' vì thế chỉ là quy ước trong code: một lỗi $executeRaw, một migration lỡ tay hay câu SQL sai đều sửa / xoá được bảng CRM, kể cả bỏ qua RLS và trigger.

**Cách sửa:** Tạo role riêng (vd thien_khue_app) có ALL trên schema thien_khue và chỉ SELECT trên các bảng public cần đọc (mau, ton_kho, khach_hang, don_hang, don_hang_dong, cham_soc_log, users, phong_ban). Dùng role này cho DATABASE_URL lúc chạy app; superuser chỉ dùng khi chạy migrate deploy.

### 21. `apps/api/src/core/supabase/supabase-admin.service.ts (taoNguoiDung email_confirm: true) + ho-so.service.ts (dangKy)`

Đăng ký công khai tạo tài khoản Auth với email_confirm=true mà không xác minh ai sở hữu email. Kẻ xấu chiếm trước được email của người khác, như email nhân sự sắp vào CRM. Trigger CRM sẽ tạo dòng public.users active=false cho email đó. Nếu sau này quản trị CRM kích hoạt dòng đó cho nhân sự thật, kẻ đăng ký trước đang giữ mật khẩu sẽ vào được CRM.

**Cách sửa:** Không đặt email_confirm=true. Gửi link xác nhận (auth.admin.generateLink / inviteUserByEmail, hoặc signUp có xác nhận), chỉ tạo ho_so và vai sau khi xác nhận. Ghi user_metadata.nguon=thien_khue để vận hành CRM nhận diện tài khoản không phải nhân sự.

### 22. `apps/api/src/modules/ban-hang/khach.service.ts (damBaoDuocBan) + don.service.ts (taoDon bước 3–4)`

Sale lách được phân bổ khách. Với SĐT chưa ai phụ trách, kể cả khách CRM cũ có lịch sử mua lớn, damBaoDuocBan tự giao khách cho người tạo đơn (THU_CONG) và transaction giao_khach commit ngay, trước khi gọi CRM tạo đơn. Nếu CRM từ chối (dòng hàng sai, CRM lỗi), việc giao vẫn giữ nguyên. Sale chỉ cần gửi một đơn hỏng với SĐT bất kỳ là thành người phụ trách, rồi xem toàn bộ đơn, tổng mua và lịch sử chăm sóc của khách đó. Điều này trái 'phân bổ theo ca/năng lực/tải; chỉ xem khách được giao'.

**Cách sửa:** Chỉ tự tiếp nhận khi SĐT chưa có khách CRM (layKhachTheoSdt null) hoặc có lead gán cho chính người đó. Khách CRM đã có thì bắt buộc qua phân bổ hoặc QUAN_LY giao. Tạo giao_khach SAU khi CRM tạo đơn thành công, hoặc khi gọi CRM lỗi thì huỷ việc giao vừa tạo.

### 23. `apps/api/src/modules/mang-luoi/ma-gioi-thieu.service.ts (traCuuCongKhai, ghiClick) + ghi-nhan-don.service.ts (timChuMa) + dao-tao/quyen-sku.service.ts (tangPhienBan)`

Khi quyền SKU chuyển CAN_HOC_LAI (tài liệu đổi) hoặc THU_HOI, mã giới thiệu của mã đó vẫn bat=true. Trang công khai vẫn nhận ?mgt=, lead vẫn mang mã, và timChuMa vẫn coi mã hợp lệ (chỉ kiểm vai, không kiểm quyền SKU). Đơn vì vậy vẫn được ghi cho CTV/KOC đang bị chặn bán. Nếu Sale chốt đơn đó thì đơn bị đẩy sang CHO_XAC_MINH. README yêu cầu chặn bán cho tới khi xác nhận hoặc học lại.

**Cách sửa:** Trong timChuMa và traCuuCongKhai, kiểm thêm quyenSku.coQuyen(chủ mã, ma.mau_id); không có quyền thì coi như mã tắt. Khi tangPhienBan hoặc thu hồi quyền, tắt tạm các ma_gioi_thieu của (ho_so, mau). Sau khi xác nhận/học lại, cho bật lại qua doiTrangThai (đã kiểm quyền).

### 24. `apps/api/src/modules/mang-luoi/ghi-nhan-don.service.ts (tinhChoNguoiBan)`

Hoa hồng chỉ tính trên các dòng SKU mà người bán đang có quyền HOAT_DONG vào lúc tính (layMauDuocPhep hiện tại), không phải lúc bán. Lúc tính có thể muộn nhiều ngày: xacMinh, taoHoaHongNeuThieu sau khi duyệt, hoặc job tạo bù. Nếu giữa chừng tài liệu đổi (CAN_HOC_LAI), dòng bán hợp lệ bị tính 0đ. Ngược lại, người bán khi chưa có quyền mà sau đó học đạt thì được hưởng hoa hồng cho dòng đã bán trái luật.

**Cách sửa:** Xét quyền theo thời điểm don.created_at. Có thể dùng quyen_sku.cap_luc ≤ created_at và (thu_hoi_luc null hoặc > created_at), kèm lịch sử CAN_HOC_LAI trong bang_chung/nhat_ky. Hoặc chụp danh sách SKU được phép ngay khi ghi nhận đơn (lưu vào ghi_nhan_don) và dùng bản chụp đó khi tạo hoa hồng.

### 25. `apps/api/src/core/crm/crm-doc.service.ts (DIEU_KIEN_DON_HOP_LE) + khach-doi-tac/hang-thanh-vien.ts`

'Đơn hợp lệ' gồm cả đơn 'moi' và 'dang_giao', tức chưa thực mua. Khách đặt vài đơn lớn là lên VIP hoặc đủ 10 lần mua ngay, được cấp voucher/quà theo hạng (capPhatTheoHang) và được mời KH hạnh phúc, rồi bom hàng hoặc huỷ. README tính tích luỹ 'từ đơn thực mua'.

**Cách sửa:** Tích luỹ hạng và đếm lần mua chỉ tính trang_thai='giao_thanh_cong' (cộng trừ phần trả như mục đổi trả). Nếu muốn hiển thị 'đang chờ' thì tách riêng, không dùng để xét quyền lợi.

### 26. `apps/api/src/modules/khach-doi-tac/uu-dai.service.ts (layUuDaiCuaToi, capNhatCapPhat)`

Khi đơn hoàn/trả làm khách rớt hạng, các cap_phat_uu_dai đã cấp theo hạng cũ vẫn DA_CAP: vẫn hiện trong 'da_cap' của khách và vẫn chuyển được sang DA_DUNG mà không kiểm hạng hiện tại. README yêu cầu tự tính lại cả 'điều kiện quyền lợi' khi hoàn/trả.

**Cách sửa:** Trong capNhatCapPhat (DA_DUNG) và layUuDaiCuaToi, kiểm lại hangDuocHuong(uu_dai.hang_ap_dung, hạng hiện tại). Không còn đủ hạng thì chặn dùng và hiển thị 'không còn hiệu lực', hoặc job chuyển các cấp phát đó sang HUY (hoàn suất voucher).

### 27. `apps/api/src/modules/ban-hang/don.service.ts (taoDon)`

Tạo đơn không áp quyền lợi hạng. don_gia mặc định là gia_ban, không tính hạng của khách, không trừ 5% (Thân thiết) hay 10% (VIP). Mức giảm theo hạng (hang_thanh_vien_cau_hinh.giam_gia_phan_tram) vì vậy chỉ để hiển thị, không bao giờ tới đơn CRM.

**Cách sửa:** Trong taoDon, tính hạng từ HangThanhVienService.tinhHangTheoSdt(sdtChuan) rồi áp giảm vào don_gia gửi CRM. Lưu mức giảm và hạng vào nhat_ky/ghi_nhan_don để đối soát. Trả mức giảm cho form để Sale thấy.

### 28. `apps/api/src/core/auth/nguoi-dung.service.ts (layTuToken / taoLanDau)`

Vai lấy từ CRM chỉ map một lần ở lần đăng nhập đầu. Sau đó nhân sự bị CRM khoá (active=false), chuyển phòng hoặc mất role manager vẫn giữ SALE/CSKH/QUAN_LY HOAT_DONG trên Thiên Khuê. Họ vẫn được phân bổ khách (layUngVien chỉ xét vai_tro_ho_so), vẫn xem khách được giao và được tính là người chốt.

**Cách sửa:** Mỗi lần layTuToken, hoặc có cache ngắn, đối chiếu lại CrmDocService.layNhanSuCrm. active=false hoặc đổi nhóm quyền/role thì chuyển các vai nguồn CRM sang TAM_DUNG/KET_THUC (ghi lich_su_vai_tro) và trả 403 cho thao tác làm việc. Thêm điều kiện u.active vào layUngVien qua crm_user_id.

### 29. `apps/api/src/modules/ban-hang/phan-bo.service.ts (giaoKhach / layUngVien)`

Giới hạn so_khach_toi_da của ca có thể bị vượt. Khoá advisory chỉ theo SĐT, nên hai lead khác SĐT tới cùng lúc (ví dụ form công khai) đọc cùng daGiaoTrongCa/tải ở mức read committed. Cả hai cùng chọn một người dù người đó chỉ còn một chỗ, và tải cũng lệch so với round-robin.

**Cách sửa:** Khoá thêm theo ca hoặc người được chọn trước khi tạo giao_khach: pg_advisory_xact_lock(hashtext('tk_ca:'||ca_truc_id)), rồi đếm lại daGiaoTrongCa; vượt thì chọn lại. Hoặc dùng một khoá chung cho phân bổ tự động.

### 30. `apps/api/src/modules/ban-hang/don.service.ts (taoDon bước 5) + ghi-nhan-don.service.ts (dongBo chỉ quét [MGT:])`

Nếu CRM đã tạo đơn nhưng ghi_nhan_don lỗi (ví dụ DB tạm lỗi), đơn chỉ còn một cảnh báo. Job đồng bộ chỉ quét đơn có '[MGT:' trong ghi_chu, mà taoDon không ghi mã giới thiệu hay dấu nào vào ghi_chu CRM. Đơn đó vì vậy không bao giờ được ghi nhận người bán: Sale mất hoa hồng, và ca trùng nguồn với CTV (mã từ lead) không bao giờ vào hàng chờ xác minh.

**Cách sửa:** Khi gọi crmApi.taoDon, nối nhanMaGioiThieu(ma) vào ghi_chu, hoặc một dấu như [TK:<giao_khach_id>]. Thêm vào CrmDocService một truy vấn đơn BAN_HANG có nguoi_tao thuộc ho_so.crm_user_id (Sale Thiên Khuê) mà chưa có ghi_nhan_don, để job tạo bù.
