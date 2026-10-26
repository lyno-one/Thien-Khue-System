# Thiên Khuê S — Kiến trúc & quy ước (bản dựng 07/10/2026)

Tài liệu gốc cho mọi người (và agent) cùng dựng hệ thống. Nghiệp vụ: `README.md` ở gốc repo. Thiết kế giao diện: `thien-khue-s-src/` (README trong đó: hệ màu, font, hiệu ứng, cú pháp `.dc.html`).

## 1. Chốt với người dùng (07/10/2026)

- FE **Next.js 15** (App Router, React 19, TypeScript, Tailwind). BE **NestJS** (TypeScript). DB **Supabase dùng chung với CRM Lyno** (`D:\intern\CRM_Lyno-`), ORM **Prisma**.
- **Ưu tiên nối vào CRM, dùng lại logic CRM**: sản phẩm, khách hàng, đơn hàng, nhân sự là dữ liệu CRM — Thiên Khuê không tạo bản sao.
- Làm nhanh, chia nhiều agent.

## 2. Bố cục repo (pnpm workspace)

```
Thien-Khue-System/
├── apps/
│   ├── api/   NestJS  :3310   (prisma/, src/ chia lớp phẳng kiểu CRM — xem dưới, test/<module>/)
│   └── web/   Next.js :3300   (src/app/(storefront|auth|training|workspace|admin)/, src/features/<module>/)
├── packages/contracts/  type dùng chung api ↔ web (src/<module>.ts, export qua src/index.ts)
├── docs/                 tài liệu
├── thien-khue-s-src/     bản thiết kế gốc (KHÔNG sửa)
└── scripts/dev.mjs       chạy api + web một lệnh
```

`apps/api/src` chia lớp **phẳng** giống CRM (`D:\intern\CRM_Lyno-\apps\api\src`): mỗi lớp là một thư mục, mỗi module một file (tối đa 2–3 file service, tên `<module>-<phan>.service.ts`, giống CRM `doi-tra.service.ts` + `doi-tra-cong-khai.service.ts` + `doi-tra-policy.service.ts`). Không có thư mục con theo module trong `controllers/`, `services/`, `repositories/`.

```
apps/api/src/
├── main.ts, app.module.ts
├── controllers/<module>.controller.ts        route + DTO + @Vai; chỉ gọi service (thêm <module>-quan-tri / -quan-ly khi có phần quản trị riêng)
├── services/<module>.service.ts              nghiệp vụ; KHÔNG gọi Prisma — chỉ gọi repository, CrmDocService, CrmApiClient, service khác
├── services/<module>-<phan>.service.ts       phần tách riêng của module (vd dao-tao-quyen-sku, ban-hang-phan-bo, quan-tri-ap-dung)
├── repositories/<module>.repository.ts       MỌI truy vấn Prisma của module (một file / module, có thể nhiều lớp repository)
├── dto/<module>/<module>.dto.ts              class-validator
├── constants/<module>.constants.ts           hằng số, nhãn, enum ánh xạ
├── common/
│   ├── guards/ decorators/ interceptors/ filters/ types/
│   └── utils/phan-trang.ts + utils/<module>.ts   hàm thuần (không DB): luật nghiệp vụ, tính toán, ánh xạ — test riêng được
├── infrastructure/{prisma,supabase,crm}/     PrismaService, Supabase admin + xác thực token, CrmDocService / CrmApiClient / chuanHoaSdt
├── jobs/<ten>.job.ts                         việc định kỳ — chỉ gọi service
├── modules/<module>.module.ts                CHỈ nối Nest (imports / controllers / providers / exports); core.module.ts là Global
└── config/cau-hinh.ts
```

## 3. Dùng chung Supabase CRM — luật cứng

- Local: Supabase của CRM (`D:\intern\CRM_Lyno-\local-integration`, API `http://127.0.0.1:54321`, DB `127.0.0.1:54322`). Khoá / URL lấy từ `D:\intern\CRM_Lyno-\local-integration\.env.local` (`API_URL`, `ANON_KEY`, `SERVICE_ROLE_KEY`, `DB_URL`) chép vào `.env.local` của từng app. Không commit `.env*` (trừ `.env.example`).
- **Bảng của Thiên Khuê nằm trong schema riêng `thien_khue`**, do Prisma quản lý (`schemas = ["thien_khue"]`). Prisma **tuyệt đối không** tạo / sửa / xoá gì trong schema `public` (của CRM). Không chạy `prisma db pull` vào schema public, không `migrate reset` (sẽ xoá DB chung).
- **Đọc** dữ liệu CRM (`public.mau`, `public.ton_kho`, `public.khach_hang`, `public.don_hang`, `public.don_hang_dong`, `public.users`, `public.phong_ban`) bằng `prisma.$queryRaw` (SQL tham số hoá) trong **một chỗ duy nhất**: `apps/api/src/infrastructure/crm/crm-doc.service.ts` (`CrmDocService`). Không module nào tự viết SQL vào schema public.
- **Ghi** dữ liệu CRM (tạo đơn, đổi trạng thái đơn, ghi chăm sóc khách…) **chỉ qua CRM apps/api** (`http://localhost:3220`, biến `CRM_API_URL`) mang **Bearer token của chính người dùng** — để CRM áp đúng luật, quyền, trigger kho / lương. Client duy nhất: `apps/api/src/infrastructure/crm/crm-api.client.ts` (`CrmApiClient`, lấy token bằng `@TokenNguoiDung()`).
- Định nghĩa nghiệp vụ lấy y CRM:
  - Khách = `khach_hang`, khoá là SĐT chuẩn hoá (`chuanHoaSdt`: bỏ ký tự không phải số, `84…` → `0…`, 9 số → thêm `0`); đơn nối khách qua `don_hang.sdt_chuan`.
  - **Đơn hợp lệ** (tích luỹ hạng, đếm lần mua): `loai_don = 'BAN_HANG'` và `trang_thai not in ('huy','hoan')`; số tiền = `tong_tien`. Hoàn / huỷ thì tự rớt khỏi tích luỹ (tính lúc đọc → hạng tự tính lại).
  - Sản phẩm / SKU = `public.mau` (mã `ma`, ví dụ `AL01`), `trang_thai <> 'ngung'`; giá `gia_ban`.
  - Nhân sự CRM = `public.users` (`role` admin/manager/employee, `phong_ban.nhom_quyen` SALE/CSKH/KHO/KE_TOAN/KHONG, `active`).
- **Bài học Lyno (bài học soạn ở CRM `/kb`, bổ sung 26/10/2026)**: Thiên Khuê **không** sao chép bài / tiến độ vào `thien_khue`, không đọc bảng `kb_*` qua `CrmDocService`. Mọi đọc / ghi đi qua CRM API `/api/kb/*` (`lo-trinh`, `bai/:id`, `bai/:id/da-doc`, `bai/:id/quiz`, `quiz/:id/nop`) bằng Bearer của chính người dùng (`CrmApiClient.layLoTrinhKb / layBaiKb / danhDauDaDocKb / layQuizKb / nopQuizKb`). CRM tự chọn bài theo nhóm quyền phòng ban → chức danh, tự tính tiến độ và chấm quiz. Route TK `/api/dao-tao/bai-lyno/*` (`BaiLynoService`): chỉ nhân sự CRM (`ho_so.crm_user_id`), người khác 403 trước khi gọi CRM; id phải là uuid (400); bài làm quiz là `{ cauHoiId (uuid) → chỉ số 0..19 }`, tối đa 200 câu (400). Lỗi CRM trả nguyên (404 bài tắt, 5xx → 502, không tới được CRM → 503). Web `/hoc-vien/bai-hoc-lyno` (+ `/[id]`), mục menu "Bài học Lyno" chỉ hiện với nhân sự Lyno, thẻ tiến độ trên `/hoc-vien`. **Bài Lyno không tính vào kích hoạt vai của Thiên Khuê** (mục 5, `XetDatService`) — hai luồng độc lập.

## 4. Đăng nhập & hồ sơ — "một hồ sơ gốc, nhiều vai"

- Đăng nhập bằng **Supabase Auth của CRM** (email + mật khẩu, supabase-js ở web). Web gửi `Authorization: Bearer <access_token>` tới Nest.
- Nest xác thực token **cục bộ qua JWKS** (`${SUPABASE_URL}/auth/v1/.well-known/jwks.json`, ES256 — giống CRM `auth.repository.ts`), kiểm `iss`, `aud=authenticated`. Guard toàn cục `JwtGuard`; route công khai đánh `@CongKhai()`.
- `thien_khue.ho_so` (id = `auth.users.id`) là **hồ sơ gốc duy nhất**. Lần đầu đăng nhập: tự tạo `ho_so`; nếu là nhân sự CRM (`public.users.active = true`) thì gắn `crm_user_id` và cấp vai theo CRM — **ưu tiên lấy vai từ CRM** (`mapVaiCrm`, `common/utils/core.ts`): admin → `ADMIN` + `THIEN_KHUE`, manager → `QUAN_LY` + `MENTOR` ở `HOAT_DONG`; nhóm quyền phòng ban `SALE / CSKH / THUC_TAP / CTV / KOL / KOC` → vai cùng tên, `DOI_TAC` → `DOI_TAC` (`HOAT_DONG`, không cần học). **Không** map theo chức danh `users.position`. Các vai phải học ở **`DANG_HOC`** (học trước khi bán áp cả nhân sự cũ; đồng bộ không bao giờ tự nâng lên `HOAT_DONG`). KHO / KE_TOAN không có vai riêng. Không phải nhân sự → `KHACH`. Ghi `lich_su_vai_tro` + `nhat_ky`.
- Đồng bộ lại mỗi lần xác thực (cache 60 s / hồ sơ, `keHoachDongBoVaiCrm`): hồ sơ cũ được bổ sung vai CRM mới; CRM đổi role / phòng / chức danh → vai **do CRM cấp** (`nguon` `CRM` / `CRM_DONG_BO`) `KET_THUC`; nhân sự bị khoá → vai do CRM cấp `TAM_DUNG` (mở khoá thì khôi phục, vai phải học về `DANG_HOC`). Vai do người cấp (`QUAN_TRI`, `DANG_KY`...) không bị đụng, trừ `ADMIN / QUAN_LY / SALE / CSKH` vẫn `TAM_DUNG` khi nhân sự bị khoá.
- **Không tự đăng ký, không tự xin vai.** Tài khoản do admin tạo trong CRM; mọi vai nghiệp vụ lấy từ CRM (role + nhóm quyền phòng ban) — đổi vai = đổi phòng ban / quyền ở CRM. Thiên Khuê **không** tạo tài khoản Auth (đã bỏ `POST /ho-so/dang-ky`), không có đăng ký thêm vai (`POST /ho-so/toi/dang-ky-vai`) hay đề xuất chuyển vai (`/ho-so/*/de-xuat-chuyen-vai`, `POST /mang-luoi/mentor/de-xuat-chuyen-vai`); bàn phê duyệt chặn lập `CHUYEN_VAI` (400). Cấp tay `POST /ho-so/:id/vai` chỉ còn nhận `KHACH`. Trang `/dang-ky` chỉ là form gửi liên hệ (`POST /cong-khai/lien-he` → lead), nhân viên Lyno gọi lại rồi tạo tài khoản ở CRM. Trạng thái học (`DANG_HOC` → `HOAT_DONG`, mục 5) vẫn do Thiên Khuê quản — đó là chuyện học, không phải cấp vai.
- Vai (`thien_khue.vai_tro_ho_so`): `KHACH, SALE, CSKH, CTV, THUC_TAP, KOL, KOC, MENTOR, DOI_TAC, QUAN_LY, ADMIN, THIEN_KHUE` (THIEN_KHUE = CEO / người duyệt cao nhất). Một hồ sơ nhiều vai, mỗi vai có `trang_thai` (`DANG_HOC`, `HOAT_DONG`, `TAM_DUNG`, `KET_THUC`) và **lịch sử chuyển vai** (`lich_su_vai_tro`, chỉ INSERT).
- Quyền: decorator `@Vai("SALE", "CSKH")` (chuỗi, kiểm vai `HOAT_DONG`; `ADMIN` / `THIEN_KHUE` luôn qua) + `VaiGuard` toàn cục; quyền theo SKU: `QuyenSkuService.kiem(hoSoId, mauId, hanhDong)` (`services/dao-tao-quyen-sku.service.ts`, export từ `DaoTaoModule` cùng `QuyenSkuGuard` ở `common/guards/quyen-sku.guard.ts`). Danh tính luôn từ token (`@NguoiDung()`), **không bao giờ** từ body / query.

## 5. Học trước khi bán (cấp quyền theo SKU)

- Áp cho SALE, CSKH, CTV, THUC_TAP, KOL, KOC. Vai chỉ `HOAT_DONG` khi: xong kiến thức chung + phần riêng theo vai, **bài kiểm tra bắt buộc ≥ 90%**, bài thực hành được duyệt.
- **Quyền bán theo từng SKU** (`thien_khue.quyen_sku`): học + thi đạt khoá sản phẩm của mã nào mới được tư vấn / lấy mã giới thiệu / nhận chiến dịch của đúng mã đó. Mọi API thao tác với sản phẩm phải qua `QuyenSkuService`.
- Sản phẩm đổi thông tin quan trọng (`phien_ban_tai_lieu` của khoá SKU tăng) → quyền SKU chuyển `CAN_HOC_LAI`, gửi thông báo, chặn bán tới khi xác nhận / học lại.
- Lưu bằng chứng đạt: điểm, bài thực hành, nhận xét, người chấm, ngày duyệt, phiên bản tài liệu, thời điểm cấp quyền.

## 6. Module & người sở hữu (mỗi agent chỉ sửa phần của mình)

File của một module trong `apps/api/src` (bỏ tiền tố `src/`; `*` = tên module ở cột đầu). Mọi module đều có `modules/<module>.module.ts`, `dto/<module>/<module>.dto.ts`, test ở `apps/api/test/<module>/`.

| Module | controllers/ | services/ | repositories/ | common/utils/, constants/ | apps/web | contracts |
|---|---|---|---|---|---|---|
| Nền tảng `core` (agent nền) | `health.controller.ts` | `core.service.ts` (NhatKy, ThongBao, NguoiDung) | `core.repository.ts` | `utils/core.ts` (mapVaiCrm), `utils/phan-trang.ts`; cộng `common/{guards,decorators,interceptors,filters,types}`, `infrastructure/`, `config/`, `app.module.ts`, `main.ts`, `prisma/schema.prisma` + migration + seed | `src/app/layout.tsx`, `src/app/(group)/layout.tsx`, `src/lib/`, `src/components/ui/`, `src/components/khung/`, `src/providers/`, `tailwind.config.ts`, `globals.css` | `index.ts`, `chung.ts` |
| Hồ sơ & vai `ho-so` | `ho-so.controller.ts` | `ho-so.service.ts` (HoSo, XacMinhSdt), `ho-so-vai.service.ts` (Vai, DieuKienHoc) | `ho-so.repository.ts` | `utils/ho-so.ts` (luật vai, giới hạn tần suất, điều kiện học), `ho-so.constants.ts` | `src/app/(auth)/`, `src/features/ho-so/`, trang `/tai-khoan` | `ho-so.ts` |
| Đào tạo (LMS) BE `dao-tao` | `dao-tao.controller.ts`, `dao-tao-quan-tri.controller.ts`, `dao-tao-luyen-ai.controller.ts`, `dao-tao-bai-lyno.controller.ts` | `dao-tao.service.ts` (XetDat, HocVien, KiemTra, ThucHanh, TienDoDoi), `dao-tao-quyen-sku.service.ts`, `dao-tao-quan-tri.service.ts`, `dao-tao-luyen-ai.service.ts`, `dao-tao-bai-lyno.service.ts` (BaiLyno — bài học CRM, không repository) | `dao-tao.repository.ts` | `utils/dao-tao.ts` (chấm điểm, tiến độ, ánh xạ), `utils/dao-tao-luyen-ai.ts`, `utils/dao-tao-bai-lyno.ts` (kiểm bài làm quiz Lyno) | — | `dao-tao.ts` |
| Đào tạo (LMS) FE | — | — | — | — | `src/app/(training)/hoc-vien/**` (gồm `bai-hoc-lyno/`), `src/features/dao-tao/` (gồm `man-bai-lyno.tsx`, `man-hoc-bai-lyno.tsx`) | (đọc `dao-tao.ts`) |
| Trang công khai `cong-khai` | `cong-khai.controller.ts` | `cong-khai.service.ts` (SanPhamCongKhai, LienHe) | `cong-khai.repository.ts` | `utils/cong-khai.ts`, `cong-khai.constants.ts` | `src/app/(storefront)/**`, `src/features/storefront/` | `cong-khai.ts` |
| Sale / CSKH `ban-hang` (phân bổ khách theo ca + tải, khách được giao, tạo đơn qua CRM) | `ban-hang.controller.ts` | `ban-hang.service.ts` (CaTruc, Lead, Khach, Don, HoTro, HopViec), `ban-hang-phan-bo.service.ts` | `ban-hang.repository.ts` | `utils/ban-hang.ts` (giờ VN, chọn người phụ trách), `ban-hang.constants.ts` | `src/app/(workspace)/lam-viec/ban-hang/**`, `src/features/ban-hang/` | `ban-hang.ts` |
| Mạng lưới `mang-luoi` (CTV, TTS, KOL/KOC: mã giới thiệu, chiến dịch, video, ghi nhận đơn, ví hoa hồng) | `mang-luoi.controller.ts`, `mang-luoi-quan-ly.controller.ts` | `mang-luoi.service.ts` (MaGioiThieu, ChienDich, ThucTap), `mang-luoi-hoa-hong.service.ts` (GhiNhanDon, HoaHong) | `mang-luoi.repository.ts` | `utils/mang-luoi.ts` (quy tắc hoa hồng), `mang-luoi.constants.ts`; `jobs/dong-bo-don.job.ts` | `src/app/(workspace)/lam-viec/mang-luoi/**`, `src/features/mang-luoi/` | `mang-luoi.ts` |
| Khách hàng & đối tác `khach-doi-tac` (hạng thẻ, KH hạnh phúc, quà / voucher, đối tác chiến lược) | `khach-doi-tac.controller.ts` | `khach-doi-tac.service.ts` (HangThanhVien, KhHanhPhuc, DoiTac), `khach-doi-tac-uu-dai.service.ts` | `khach-doi-tac.repository.ts` | `utils/khach-doi-tac.ts` | `src/app/(workspace)/thanh-vien/**`, `src/features/khach-doi-tac/` | `khach-doi-tac.ts` |
| Quản trị `quan-tri` (6 nhóm hồ sơ, bàn phê duyệt, maker-checker, nhật ký) | `quan-tri.controller.ts` | `quan-tri.service.ts` (DeXuat, HoSoQuanTri, TongQuan), `quan-tri-ap-dung.service.ts` | `quan-tri.repository.ts` | `utils/quan-tri.ts` (luật duyệt) | `src/app/(admin)/quan-tri/**`, `src/features/quan-tri/` | `quan-tri.ts` |

- **Sửa / huỷ / ngừng (bổ sung 17/10/2026)**, không đổi schema:
  - Thông báo: `GET /api/thong-bao[?chi_chua_doc&gioi_han]`, `GET /api/thong-bao/chua-doc`, `POST /api/thong-bao/da-doc {ids?}` (`controllers/thong-bao.controller.ts`, trong `CoreModule`); chuông ở `KhungSidebar`, trang `/thong-bao`.
  - Tỷ lệ hoa hồng: `GET /api/quan-tri/phe-duyet/ty-le-hoa-hong` (hiện hành + lịch sử), trang `/quan-tri/hoa-hong` chỉ đọc; đổi tỷ lệ vẫn qua đề xuất `DOI_CHINH_SACH`.
  - Quà / voucher: `PATCH` + `DELETE` chỉ **người đề xuất / người tạo**, chỉ khi chưa duyệt (quà đã thẩm định thì chỉ huỷ, không sửa); bản đã `TU_CHOI` sửa xong quay lại `CHO_THAM_DINH`. `POST …/ngung` (chỉ `THIEN_KHUE` thật, bắt buộc lý do) ngừng bản đã duyệt: quà → `TU_CHOI` kèm lý do, voucher → `het_han = now`; lượt đã cấp giữ nguyên.
  - Mã giới thiệu `DELETE /mang-luoi/ma-gioi-thieu/:id` (chủ mã, chỉ khi 0 click và 0 đơn); chiến dịch `DELETE /mang-luoi/quan-ly/chien-dich/:id` (chỉ `NHAP`, chưa ai đăng ký / nội dung / mã) — còn lại dùng tắt mã / `KET_THUC`.
- Agent nền tạo **sẵn** thư mục, module rỗng đã đăng ký trong `app.module.ts`, file contracts rỗng, **toàn bộ `schema.prisma`** (mọi bảng của mọi module) + migration đã áp. Agent module **không sửa** `schema.prisma`, `app.module.ts`, file của module khác. Cần thêm cột / bảng: ghi vào mục "Cần đổi schema" trong kết quả trả về (agent tích hợp gom lại).
- Module gọi nhau qua service đã export (vd `QuyenSkuService` từ `dao-tao`, `CrmDocService` từ core) — không inject repository của module khác. Ngoại lệ đang có: `ho-so.repository.ts` dùng hàm `napDuLieuHocVien` của `dao-tao.repository.ts` (cùng luật đọc LMS, tránh vòng import module); repository `dao-tao` / `quan-tri` ghi bảng vai / quyền / hoa hồng trong **cùng transaction** duyệt / xét đạt (giữ nguyên tử).

## 7. Quy ước code (giống CRM Lyno)

- Tên biến / hàm / file / comment **tiếng Việt không dấu** (`layDanhSach`, `capQuyenSku`, `ho-so.service.ts`); chữ hiển thị tiếng Việt có dấu. Comment ngắn, nói *vì sao*.
- Nest chia lớp như CRM: `controller` → `service` → `repository` → Prisma. Controller chỉ nhận DTO + danh tính rồi gọi service. Service giữ nghiệp vụ, gọi repository / `CrmDocService` / `CrmApiClient` / service khác — **không** dùng `PrismaService`, `$transaction`, `tx.<bảng>` trực tiếp. Repository giữ **mọi** truy vấn Prisma của module (where / include / select, updateMany có điều kiện…), không chứa luật nghiệp vụ. Hàm thuần (không DB) để ở `common/utils/<module>.ts`, hằng ở `constants/<module>.constants.ts`. Module (`modules/<module>.module.ts`) chỉ nối Nest. Ngoại lệ hạ tầng: `HealthController` ping DB bằng `PrismaService`.
- DTO bằng `class-validator` (`ValidationPipe` whitelist + forbidNonWhitelisted). Lỗi dùng exception Nest (`BadRequestException`…) với câu tiếng Việt. Response bọc `{ data, meta? }` (interceptor ở `common/interceptors`).
- Tiền: số nguyên đồng (`Decimal`/`numeric` → trả `number`). Ngày giờ theo `Asia/Ho_Chi_Minh` khi hiển thị.
- Thao tác tiền / quyền nhiều bước → một transaction: service gọi `repo.chayTrongGiaoDich(async tx => …)` rồi truyền **cùng `tx`** cho các hàm repository (tham số `db`, mặc định `this.prisma`), `NhatKyService.ghi(…, tx)`, `ThongBaoService.gui(…, tx)`. Phê duyệt qua bảng `de_xuat_duyet`, số bước theo loại (`common/utils/quan-tri.ts`, contracts `LOAI_DE_XUAT_BA_BUOC`): **tiền + dữ liệu khách** (`CHI_TRA_HOA_HONG`, `DIEU_CHINH_HOA_HONG`, `XAC_MINH_DON`, `XUAT_DU_LIEU_KHACH`) đi 3 bước đề xuất → kiểm → duyệt, ba người khác nhau; **mọi loại khác** 2 bước đề xuất → duyệt (người duyệt ≠ người đề xuất ≠ người liên quan; quà / voucher / chính sách chỉ `THIEN_KHUE` duyệt). Mọi vai nghiệp vụ lấy từ CRM (`VAI_TU_CRM`: mọi vai trừ `KHACH`) — không cấp / chuyển bằng đề xuất (lập `CHUYEN_VAI` → 400; đề xuất cũ còn chờ duyệt cũng bị chặn lúc duyệt). Thực tập sinh và CTV là hai vai tách biệt: học đạt khoá CTV **không** tự thêm vai CTV (đã gỡ cơ chế tự nâng TTS → CTV).
- Không lộ dữ liệu khách cá nhân cho đối tác; Sale / CSKH chỉ xem khách được giao.
- Test: Jest (unit service với Prisma mock: dựng repository thật bọc mock, vd `new KiemTraService(new KiemTraRepository(prisma), …)`) trong `apps/api/test/<module>/`; chạy được không cần DB. Mỗi module có ít nhất test cho luật nghiệp vụ chính (90%, chặn SKU, một đơn một người bán, hạng thẻ…).

## 8. Giao diện

- **Hệ thiết kế trắng xanh của CRM Lyno** (chốt 07/10/2026): nguồn chuẩn `D:\intern\CRM_Lyno-\DESIGN.md` + `apps/web/src/styles/globals.css` + `tailwind.config.ts` + `components/ui/lop.ts` của CRM (chỉ đọc, không sửa CRM). Bố cục và nội dung trang vẫn theo thiết kế gốc `thien-khue-s-src/src/*.dc.html` (`{{x}}` → JSX, `<sc-for>` → `map`, `<sc-if>` → điều kiện); **màu, chữ, bo góc, bóng, khoảng cách theo DESIGN.md của CRM**, không theo bảng màu cũ của bản thiết kế.
- Token khai báo **một lần** ở nền: biến CSS (kênh RGB) trong `apps/web/src/app/globals.css`, nối Tailwind trong `apps/web/tailwind.config.ts`. Component chỉ dùng **token ngữ nghĩa**: nền `bg-nen` / `bg-be-mat` / `bg-be-mat-phu`; viền `border-vien` / `border-vien-dam`; chữ `text-chu` / `text-chu-phu` / `text-chu-mo`; xanh chủ đạo `bg-chinh` / `hover:bg-chinh-dam` / `bg-chinh-nhat` + `text-tren-chinh`; tín hiệu `loi` / `canh-bao` / `thanh-cong` (+ `-nhat`). Thang `xanh-*` / `muc-*` chỉ dùng khi token ngữ nghĩa không đủ (khối tối phẳng `bg-xanh-800`, chữ trên nền tối `text-muc-200`).
- **Không viết mã hex trong component.** Đã bỏ hẳn vàng bơ, cam san hô, tím lilac, xanh ngọc và gradient tím-xanh; các alias màu `tk-*` cũ đã gỡ khỏi `tailwind.config`. Hex chỉ còn ở `globals.css` (định nghĩa token), `app/icon.svg` và `themeColor` trong `app/layout.tsx`.
- Chữ: một họ Inter; thang cỡ `text-h1…h4`, `text-body`, `text-body-lg`, `text-caption`, `text-so` (số liệu), riêng storefront có `text-hien-thi` cho tiêu đề hero. Bo 8px (`rounded-lg`) cho nút/ô, 12px (`rounded-xl`) cho thẻ; bóng `shadow-sm/md/xl` = `--bong-1/2/3`.
- Class điều khiển dùng chung trong `src/components/ui/lop.ts` (nút, ô nhập, thẻ, danh sách, tab `lopThanhTab`+`lopTab`, chip `lopChip`+`lopChipTong`, kicker, liên kết). Component: `Nut`/`NutLienKet` (kiểu `chinh`, `vien`, `toi`, `bo`, `nhat`, `trong`, `vien-toi` cho nút viền trên nền tối, `vien-loi` cho Danger viền đỏ, `nguy-hiem`), `Nhan` (tông `chinh`, `trung-tinh`, `thanh-cong`, `canh-bao`, `loi`, `dam`), `DauLogo` (đổi màu bằng prop `mau`). `cn` chỉ nối chuỗi, không gộp class trùng loại → muốn đổi màu/kích thước thì dùng prop, không truyền class đè.
- Hiệu ứng `tk-*` (`tk-up`, `tk-reveal`, `tk-lift`, `tk-marquee`…) giữ nhưng tiết chế: chỉ hiện dần, đổi màu/bóng nhẹ khi rê chuột, không nhảy, không gradient chạy; tắt hết khi `prefers-reduced-motion`.
- Ảnh hero: `apps/web/public/hero-nen-trang.jpg`. Ảnh sản phẩm lấy thật từ CRM (`anh_url` qua API công khai); mẫu chưa có ảnh hiện khung tên mẫu, không để chữ `[...]`.
- Mobile 390px không cuộn ngang. Mọi nút mua ngoài trỏ `https://lyno.vn/` như thiết kế, trừ chỗ đã có luồng thật. Ảnh kiểm giao diện (desktop 1440 / mobile 390): `docs/anh-giao-dien/`.

## 9. Chạy local (đã chạy thật 07/10/2026)

### 9.1. Điều kiện

- Node ≥ 20, **pnpm 10+** (máy dev đang dùng pnpm 12.9.1, cài bằng `npm i -g pnpm`). Không cần cài gì toàn cục khác.
- Supabase local của CRM đang chạy: `cd D:\intern\CRM_Lyno-\local-integration && npx supabase@2.118.0 start --workdir .` → API `http://127.0.0.1:54321`, DB `127.0.0.1:54322`, khoá trong `.env.local` của thư mục đó.
- CRM `apps/api` chạy ở `http://localhost:3220` (cần cho thao tác **ghi** qua CRM: tạo đơn, ghi chăm sóc, khách cần chăm). Đọc dữ liệu CRM không cần CRM api (đọc thẳng DB qua `CrmDocService`).
- `apps/api/.env.local`, `apps/web/.env.local` chép từ `.env.example` rồi điền khoá (xem 9.4).

### 9.2. Lệnh

```bash
pnpm install                         # tự prisma generate + build contracts
pnpm --filter api prisma:deploy      # áp migration schema thien_khue (KHÔNG đụng public)
pnpm --filter api seed               # idempotent: hạng thẻ, tỷ lệ hoa hồng tạm, 8 khoá học, 31 bài, 30 câu hỏi
pnpm dev                             # = node scripts/dev.mjs: api :3310 (nest --watch) + web :3300 (next dev), kiểm cổng trống trước

# Kiểm tra (đều xanh lúc tích hợp)
pnpm -r typecheck                    # contracts + api + web
pnpm --filter api test               # Jest, không cần DB — 38 bộ, 371 test
pnpm --filter api build              # -> apps/api/dist
pnpm --filter web build              # -> apps/web/.next

# Chạy bản build (giống production)
cd apps/api && node dist/main.js     # đọc .env.local ở thư mục hiện tại
pnpm --filter web start              # next start -p 3300
```

| Dịch vụ | Cổng | Ghi chú |
|---|---|---|
| Web Next.js | 3300 | storefront `/`, `/dang-nhap`, `/dang-ky`, `/hoc-vien`, `/lam-viec`, `/thanh-vien`, `/quan-tri`, `/tai-khoan` |
| API Nest | 3310 | tiền tố `/api`, mỗi module có `GET /api/<module>/health` |
| CRM api | 3220 | của repo CRM (chỉ gọi, không sửa) |
| Supabase CRM | 54321 / 54322 | Auth + Postgres dùng chung |

### 9.3. Tài khoản thử (Supabase local của CRM — mật khẩu `LynoLocal@2026`)

| Email | Vai trên Thiên Khuê (tự map lần đầu đăng nhập) |
|---|---|
| `admin.local@lyno.test` | ADMIN + THIEN_KHUE · HOAT_DONG |
| `manager.sales@lyno.test` | QUAN_LY + MENTOR · HOAT_DONG (+ SALE · DANG_HOC) |
| `manager.nodept@lyno.test`, `manager.warehouse@lyno.test` | QUAN_LY + MENTOR · HOAT_DONG — dùng làm người kiểm thứ hai trong maker-checker |
| `employee.marketing01@lyno.test` | không vai nghiệp vụ (nhóm KHONG — không còn map theo chức danh) |
| `employee.sales01@lyno.test`, `employee.sales02@lyno.test` | SALE · DANG_HOC (học đạt `nhap-mon` + `sale-cskh` + thực hành được chấm → HOAT_DONG; `employee.sales01` đã HOAT_DONG sau smoke test) |
| `employee.cskh01@lyno.test` | CSKH · DANG_HOC |

- CTV / thực tập / KOL / KOC / đối tác: **không tự đăng ký** — admin tạo tài khoản trong CRM, gán phòng ban có nhóm quyền tương ứng (CRM migration 079; tài khoản thử `employee.ctv01` / `employee.koc01` / `employee.tts01` @lyno.test). `/dang-ky` chỉ gửi liên hệ. Tài khoản cũ tạo khi còn tự đăng ký: `qa-ctv-47098752@thienkhue.test` / `QaCtv@2026!` (CTV + KOC nguồn `DANG_KY`, có quyền SKU AL01, mã giới thiệu `AL01-E7S5X6`).
- Vai THIEN_KHUE (CEO) ở local: `admin.local@lyno.test` tự có qua map CRM (admin → ADMIN + THIEN_KHUE).

### 9.4. Biến môi trường

- `apps/api/.env.local`: `PORT=3310`, `DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres?schema=thien_khue`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CRM_API_URL=http://localhost:3220`, `CORS_ORIGINS=http://localhost:3300`; tuỳ chọn `TRUST_PROXY` (sau proxy / CDN, để rate-limit theo IP thật), `MANG_LUOI_DONG_BO_PHUT` (job đồng bộ đơn CRM → ghi nhận / hoa hồng: giao thành công → đủ điều kiện, hoàn / huỷ / trả hàng → bị trừ; **bật mặc định**: để trống = 10 phút, chỉ đặt `0` khi muốn tắt; khoá trong tiến trình nên không chạy chồng với lần bấm tay, lỗi chỉ ghi log).
- Tích hợp Sales Training (`docs/TICH-HOP-SALES-TRAINING.md`): `SALES_TRAINING_URL` (gốc Sales Training, local `http://localhost:3020`; trống = tắt), `TICH_HOP_ST_SECRET` (bí mật HMAC ≥ 32 ký tự, giống hệt bên Sales Training; chỉ ở api, không đưa ra web).
- `apps/web/.env.local`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_API_URL=http://localhost:3310`; tuỳ chọn `NEXT_PUBLIC_SITE_URL` (metadataBase / sitemap / robots), `API_URL_NOI_BO` (Next server gọi API qua mạng nội bộ).
- Không commit `.env*` (trừ `.env.example`).

### 9.5. Đổi schema (chỉ agent tích hợp)

- Sửa `schema.prisma` → `pnpm --filter api prisma:diff` (so DB thật ↔ schema, chỉ `thien_khue`) → chép vào `prisma/migrations/<yyyymmddhhmmss>_<ten>/migration.sql`, **thêm tiền tố `"thien_khue".`** cho mọi CREATE / ALTER / DROP (diff in ra không có tiền tố) → `prisma:deploy` → `prisma:generate` → chạy lại `prisma:diff` phải ra "empty migration". Cấm `migrate dev/reset`, `db pull/push`.
- Trước / sau khi áp: so `pg_dump --schema-only --schema=public` (qua `docker exec supabase_db_crm-lyno-local pg_dump ...`) — phải giống hệt (chỉ khác dòng `\restrict` ngẫu nhiên).
- SQL viết tay Prisma không quản (migrate diff không đụng tới):
  - `20261007000000_khoi_tao`: trigger chỉ-INSERT `lich_su_vai_tro`, `nhat_ky`; CHECK maker-checker `de_xuat_duyet`; CHECK miền giá trị; REVOKE schema khỏi anon / authenticated.
  - `20261007120000_tich_hop_module`: bảng `yeu_cau_ho_tro`; `luot_lam.cau_hoi_ids` (chốt đề theo lượt); `voucher.nguoi_de_xuat_id / nguoi_tham_dinh_id`; unique `dieu_chinh_hoa_hong.de_xuat_duyet_id`, `moi_kh_hanh_phuc.sdt_chuan`; index `ma_gioi_thieu(ho_so_id, mau_id, chien_dich_id)`; **unique một phần** `giao_khach(sdt_chuan) WHERE trang_thai='DANG_PHU_TRACH'`; CHECK 3 người khác nhau cho `qua_tang`, CHECK người tạo ≠ người thẩm định / duyệt cho `voucher`.
  - `20261007170000_luyen_ai`: CHECK `phien_luyen_ai` (điểm 0–100, đạt ⇒ 0 vi phạm), CHECK bài `LUYEN_AI` phải có `bang_chung`; **unique một phần** `bai_thuc_hanh(ho_so_id, khoa_hoc_id) WHERE trang_thai='CHO_CHAM' AND nguon='LUYEN_AI'`.
  - `20261008100000_phieu_xem_luyen_ai`: CHECK `phieu_luyen_ai_muc_dich_chk` (phiếu `XEM` ⇔ có `phien_id_st` + `vai_xem` ∈ CHU / MENTOR / QUAN_LY).
  - `20261007190000_phe_duyet_hai_buoc`: chỉ dữ liệu — đề xuất loại 2 bước đang `CHO_KIEM` chuyển sang `CHO_DUYET` (code vẫn coi 2 bước + `CHO_KIEM` là chờ duyệt, cho bản ghi module khác tạo).

### 9.6. Module gọi nhau (sau tích hợp)

| Gọi từ | Service | Việc |
|---|---|---|
| ban-hang, mang-luoi | `QuyenSkuService` (dao-tao) | chặn SKU chưa đạt |
| cong-khai | `PhanBoService.phanBoLead` (ban-hang) | phân bổ lead ngay khi khách gửi form (không chặn phản hồi; không ai trực → lead ở MOI, báo QUAN_LY) |
| ban-hang | `GhiNhanDonService.timChuMa / taoHoaHongNeuThieu` (mang-luoi) | mã giới thiệu hợp lệ + hoa hồng theo SKU được quyền khi Sale chốt đơn |
| quan-tri | `GhiNhanDonService.taoHoaHongNeuThieu`, `HoaHongService.apDungDieuChinh` (mang-luoi) | sau khi duyệt XAC_MINH_DON / DIEU_CHINH_HOA_HONG (chạy sau commit; lỗi thì job đồng bộ / nút "Áp dụng" làm bù) |
| ho-so | hàm thuần `tinhTienDo`, `napDuLieuHocVien` (dao-tao) | điều kiện kích hoạt vai cùng luật với `XetDatService` |
| dao-tao (bài học Lyno) | `CrmApiClient` (`/api/kb/*` của CRM, token người dùng) | đọc lộ trình / bài / quiz, đánh dấu đã học, nộp quiz — không lưu gì ở `thien_khue` |
| mọi module | `CrmDocService` | thêm `layDonCoMaGioiThieu`, `layDonTheoIds`, `layChamTheoKhach`, `layKhachTheoTongMua`, `layDanhSachKhach`, `demMau` |

- Storefront: `/san-pham/<SKU>?mgt=<mã>` ghi lượt click và nhớ mã 30 ngày → form "Tư vấn cho tôi" gửi kèm `ma_gioi_thieu` vào lead. `/vip`, `/than-thien` lấy ngưỡng hạng thật từ `GET /api/khach-doi-tac/hang/cau-hinh`. Có `sitemap.xml`, `robots.txt`.
- Response API: thành công `{ data, meta? }`, lỗi `{ error: { code, message, details? } }` (giống CRM). Hướng dẫn chi tiết: `apps/api/README.md`, `apps/web/README.md`.
