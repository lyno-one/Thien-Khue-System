# apps/api — Nest API Thiên Khuê S (:3310)

NestJS 11 + Prisma 6 (chỉ schema `thien_khue` trong Supabase dùng chung với CRM Lyno). Luật chung: `docs/KIEN-TRUC.md`.

## Chạy

```bash
cp .env.example .env.local          # điền khoá từ D:\intern\CRM_Lyno-\local-integration\.env.local
pnpm --filter api prisma:deploy     # áp migration schema thien_khue (KHÔNG đụng public)
pnpm --filter api seed              # dữ liệu mẫu (idempotent)
pnpm --filter api dev               # http://localhost:3310/api/health
pnpm --filter api test              # Jest, không cần DB
pnpm --filter api typecheck
pnpm --filter api build
```

Thêm bảng / cột (chỉ agent tích hợp): sửa `prisma/schema.prisma` →
`pnpm --filter api prisma:diff > prisma/migrations/<yyyymmddhhmmss>_<ten>/migration.sql` (diff DB thật ↔ schema, chỉ schema `thien_khue`) → `pnpm --filter api prisma:deploy` → `pnpm --filter api prisma:generate`.
**Cấm** `prisma migrate dev/reset`, `prisma db pull/push`.

## Cấu trúc (phẳng, chia lớp giống CRM — chi tiết `docs/KIEN-TRUC.md` mục 2, 6, 7)

```
prisma/schema.prisma              hợp đồng dữ liệu chung (mọi bảng mọi module) — agent module không sửa
prisma/migrations/                SQL đã áp (có phần viết tay: trigger chỉ-INSERT, CHECK maker-checker)
prisma/seed.ts                    hạng thành viên, tỷ lệ hoa hồng, khoá học + câu hỏi (từ LMS.dc.html + public.mau)
src/main.ts                       prefix /api, CORS, ValidationPipe (whitelist + forbidNonWhitelisted + transform)
src/app.module.ts                 đăng ký module
src/controllers/<module>.controller.ts          route, DTO, @Vai — chỉ gọi service
src/services/<module>[-<phan>].service.ts        nghiệp vụ — gọi repository / CrmDocService / CrmApiClient, KHÔNG gọi Prisma
src/repositories/<module>.repository.ts         mọi truy vấn Prisma của module (có chayTrongGiaoDich + tham số db cho tx)
src/dto/<module>/<module>.dto.ts                class-validator
src/constants/<module>.constants.ts             hằng số, nhãn
src/common/guards/                JwtGuard (JWKS ES256), VaiGuard, QuyenSkuGuard
src/common/decorators/            @CongKhai @Vai @NguoiDung @TokenNguoiDung
src/common/interceptors/ filters/ bọc { data, meta? }, lỗi { error: { code, message } }
src/common/types/                 ThongTinNguoiDung
src/common/utils/                 phan-trang.ts + <module>.ts (hàm thuần, không DB)
src/infrastructure/prisma/        PrismaService
src/infrastructure/supabase/      SupabaseAdminService, XacThucTokenService
src/infrastructure/crm/           CrmDocService (đọc public.*), CrmApiClient (ghi qua CRM), chuanHoaSdt
src/jobs/                         dong-bo-don.job.ts (chỉ gọi service)
src/modules/<module>.module.ts    chỉ nối Nest; core.module.ts là Global (Prisma, CrmDoc, CrmApi, NhatKy, ThongBao, NguoiDung...)
test/<module>/*.spec.ts           unit test (Prisma mock bọc trong repository thật)
```

## Viết controller / service / repository

```ts
// controllers/ban-hang.controller.ts
@Controller("ban-hang")                                  // -> /api/ban-hang/*
export class BanHangController {
  constructor(private readonly khach: KhachService) {}

  @Vai("SALE", "CSKH")                                   // vai HOAT_DONG; ADMIN / THIEN_KHUE luôn qua
  @Get("khach")
  danhSachKhach(@NguoiDung() nd: ThongTinNguoiDung, @Query() q: KhachDuocGiaoQueryDto) {
    return this.khach.danhSach(nd, q);                   // trả về -> { data, meta? }
  }

  @CongKhai()                                            // không cần đăng nhập; @NguoiDung() có thể undefined
  @Get("health") health() { return { ok: true }; }
}

// services/ban-hang.service.ts — nghiệp vụ, không đụng Prisma
@Injectable()
export class KhachService {
  constructor(private readonly repo: KhachRepository, private readonly crmDoc: CrmDocService, private readonly nhatKy: NhatKyService) {}
}

// repositories/ban-hang.repository.ts — mọi truy vấn Prisma
@Injectable()
export class KhachRepository {
  constructor(private readonly prisma: PrismaService) {}
  chayTrongGiaoDich<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>) { return this.prisma.$transaction(fn); }
  ketThuc(id: string, db: Prisma.TransactionClient = this.prisma) { /* db.giao_khach.updateMany(...) */ }
}
```

- Danh tính **chỉ** từ `@NguoiDung()` (token), không bao giờ từ body / query.
- Phân trang: `const { skip, take, trang, so_dong } = phanTrang(query)` → `return coMeta(ds, taoMetaPhanTrang(trang, so_dong, tong))` → `{ data, meta }`.
- Lỗi: `throw new BadRequestException("Câu tiếng Việt")` → `{ error: { code, message } }`. Prisma P2002 → 409, P2025 → 404.
- Tiền `Decimal` tự thành `number` khi trả về.
- Nhiều bước ghi: `this.repo.chayTrongGiaoDich(async tx => { ...repo.x(..., tx); nhatKy.ghi(..., tx) })` — cùng một `tx`.
- Quyền SKU: `imports: [DaoTaoModule]` rồi `await this.quyenSku.kiem(nd.id, mauId, "LAY_MA_GIOI_THIEU")` (403 nếu chưa đạt).
- Nhật ký: `await this.nhatKy.ghi({ hoSoId: nd.id, hanhDong: "DUYET_QUA", doiTuong: "qua_tang", doiTuongId: id }, tx)`.
- Thông báo: `await this.thongBao.gui({ hoSoId, loai: "QUYEN_SKU", tieuDe: "…" }, tx)`.

## CrmDocService (đọc CRM, chỉ SELECT)

`layMau(id)`, `layMauTheoMa(ma)`, `layMauTheoIds(ids)`, `layDanhSachMau({ baoGomNgung, tuKhoa, gioiHan, boQua })`, `layTonKho(mauId)`,
`layKhachTheoSdt(sdt)`, `layDonTheoSdt(sdt)`, `layDon(id)`, `layDonTheoMa(ma)`, `layDongDon(donId)`,
`tongMuaHopLe(sdt)` (đơn hợp lệ = `BAN_HANG` và không `huy`/`hoan`), `layKhachDuSoLanMua(soLan)`, `layNhanSuCrm(userId)`, `layNhanSuTheoNhom(nhom)`.
Cần truy vấn CRM mới → ghi vào "Cần đổi chung" (agent nền / tích hợp thêm vào đây), không tự viết SQL vào `public`.

## Đăng nhập lần đầu

JwtGuard xác thực token qua JWKS → `NguoiDungService.layTuToken`: chưa có `ho_so` thì tạo; nhân sự CRM đang làm → gắn `crm_user_id`, vai theo `mapVaiCrm` (admin → ADMIN, manager → QUAN_LY: `HOAT_DONG`; nhóm SALE / CSKH → SALE / CSKH: `DANG_HOC` — học trước khi bán); người khác → `KHACH`. Ghi `lich_su_vai_tro` + `nhat_ky`.
