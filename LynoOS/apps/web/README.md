# apps/web — Next.js 15 Thiên Khuê S (:3300)

App Router, React 19, TypeScript, Tailwind 3. Thiết kế gốc: `thien-khue-s-src/src/*.dc.html` (bám sát). Luật chung: `docs/KIEN-TRUC.md`.

```bash
cp .env.example .env.local     # NEXT_PUBLIC_SUPABASE_URL / ANON_KEY (CRM local), NEXT_PUBLIC_API_URL=http://localhost:3310
pnpm --filter web dev          # http://localhost:3300
pnpm --filter web typecheck
pnpm --filter web build
```

## Cấu trúc

```
src/app/layout.tsx               font Inter (next/font, --font-inter) + AuthProvider — giao diện trắng xanh theo D:\intern\CRM_Lyno-\DESIGN.md
src/app/globals.css              token CRM (biến kênh RGB: --xanh-*, --muc-*, --nen, --be-mat, --chinh…, --bong-1..3) + hiệu ứng tk-* đã tiết chế
tailwind.config.ts               token ngữ nghĩa (bg-nen, bg-be-mat, text-chu-phu, border-vien, bg-chinh, text-loi…), text-h1..caption/so; tk-* chỉ còn là ALIAS chuyển tiếp
src/app/(storefront)/            header + footer (Main.dc.html / Mobile.dc.html) — trang: agent cong-khai (/, /vip, /than-thien, /doi-tac, /dao-tao)
src/app/(auth)/                  khung + /dang-nhap — agent ho-so mở rộng (đăng ký, quên mật khẩu)
src/app/(training)/hoc-vien/**   khung học viện (LMS.dc.html) — agent dao-tao FE
src/app/(workspace)/             khung làm việc theo vai: /lam-viec (tổng quan), /lam-viec/ban-hang/**, /lam-viec/mang-luoi/**, /thanh-vien/**
src/app/(admin)/quan-tri/**      khung quản trị (QUAN_LY / ADMIN / THIEN_KHUE) — agent quan-tri
src/components/ui/               Nut, NutLienKet, ONhap, OChon, OVanBan, OLuaChon, The, TheTieuDe, TheSoLieu, TieuDeTrang,
                                 Nhan, Bang, HopThoai, DangTai, KhungCho, Loi, Trong, ThongBaoNoiDong, DauLogo, ChuLogo
                                 lop.ts: lopNutChinh / lopNutPhu / lopO / lopThe / lopTab / lopChip… (chép từ CRM)
src/components/khung/            header/footer storefront, KhungSidebar, YeuCauDangNhap, nav.ts (menu từng khu)
src/lib/api.ts                   api.get/post/patch/put/delete/layCoMeta (Bearer tự gắn, lỗi -> LoiApi), thongDiepLoi
src/lib/supabase.ts              laySupabase, layAccessToken, dangNhapEmail
src/lib/dinh-dang.ts             dinhDangTien, dinhDangNgay, dinhDangNgayGio (Asia/Ho_Chi_Minh), chuCaiDau
src/providers/auth-provider.tsx  useXacThuc(): { phien, nguoiDung (GET /api/ho-so/toi), dangTai, coVai, dangNhap, dangXuat, taiLai }
src/features/<module>/           code riêng của từng module
```

## Dùng nhanh

```tsx
"use client";
import { api, thongDiepLoi } from "@/lib/api";
import { Bang, DangTai, Loi, Nut, TieuDeTrang } from "@/components/ui";
import { useXacThuc } from "@/providers/auth-provider";

const { nguoiDung, coVai } = useXacThuc();          // coVai("SALE", "CSKH")
const ds = await api.get<KhoaHoc[]>("/dao-tao/khoa-hoc");
await api.post("/cong-khai/dang-ky", body, { congKhai: true });   // route @CongKhai, không gắn token
```

- Mọi nút mua ngoài trỏ `https://lyno.vn/` như thiết kế. Mobile 390px không cuộn ngang (bảng tự cuộn trong khung).
- Ô “Tiến độ chung” cuối sidebar học viện: `src/features/dao-tao/tien-do-sidebar.tsx` (agent dao-tao FE thay nội dung).
- Trang `/tai-khoan` (agent ho-so) chưa có — link đã trỏ sẵn từ header / sidebar.
