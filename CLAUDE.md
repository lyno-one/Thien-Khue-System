# CLAUDE.md — Thiên Khuê S

Nền tảng vận hành hợp nhất Lyno & Thiên Khuê. Nghiệp vụ: `README.md`. **Kiến trúc, luật dùng chung DB với CRM, phân chia module: `docs/KIEN-TRUC.md` — đọc trước khi sửa code.** Thiết kế giao diện gốc: `thien-khue-s-src/` (không sửa).

- Monorepo pnpm: `apps/api` (NestJS + Prisma, :3310), `apps/web` (Next.js 15, :3300), `packages/contracts`.
- `apps/api/src` chia lớp **phẳng** giống CRM: `controllers/<module>.controller.ts` → `services/<module>[-<phan>].service.ts` (không gọi Prisma) → `repositories/<module>.repository.ts` (mọi truy vấn Prisma); `dto/<module>/<module>.dto.ts`, `constants/<module>.constants.ts`, `common/utils/<module>.ts` (hàm thuần), `common/{guards,decorators,interceptors,filters,types}`, `infrastructure/{prisma,supabase,crm}`, `jobs/`, `modules/<module>.module.ts` (chỉ nối Nest). Không tạo thư mục con theo module trong `controllers/ services/ repositories/`. Chi tiết: `docs/KIEN-TRUC.md` mục 2, 6, 7.
- DB = Supabase **dùng chung với CRM Lyno** (`D:\intern\CRM_Lyno-`). Prisma chỉ quản schema `thien_khue`; **không bao giờ** đụng schema `public`, không `prisma migrate reset`. Đọc bảng CRM chỉ qua `CrmDocService`; ghi dữ liệu CRM chỉ qua CRM apps/api với Bearer của người dùng (`CrmApiClient`).
- Code, tên biến, comment tiếng Việt không dấu; chữ hiển thị tiếng Việt có dấu.
- Báo cáo và giao tiếp với người dùng bằng tiếng Việt.
- Không commit / push nếu người dùng chưa yêu cầu; không thêm trailer Co-Authored-By của Claude.
