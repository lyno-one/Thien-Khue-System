import type { CauHinhHang, ChiTietSanPhamCongKhai, DanhSachSanPhamQuery, SanPhamCongKhai } from "@thien-khue/contracts";

/*
 * Doc san pham cong khai TU SERVER (Server Component) de trang co SEO: HTML co san ten / gia.
 * API_URL_NOI_BO (neu web goi api qua mang noi bo) -> NEXT_PUBLIC_API_URL -> localhost:3310.
 * API loi / tat -> null: trang van hien bo cuc voi chu cho, khong sap trang.
 */

const GOC_API = (process.env.API_URL_NOI_BO || process.env.NEXT_PUBLIC_API_URL || "http://localhost:3310").replace(/\/+$/, "");
const LAM_MOI_GIAY = 120;

async function docJson<T>(duongDan: string): Promise<{ status: number; data: T | null }> {
  try {
    const res = await fetch(`${GOC_API}/api${duongDan}`, {
      headers: { Accept: "application/json" },
      next: { revalidate: LAM_MOI_GIAY },
      signal: AbortSignal.timeout(5000)
    });
    if (!res.ok) return { status: res.status, data: null };
    const than = (await res.json()) as { data?: T };
    return { status: res.status, data: than.data ?? null };
  } catch {
    return { status: 0, data: null };
  }
}

export async function layDanhSachSanPham(q: DanhSachSanPhamQuery = {}): Promise<SanPhamCongKhai[] | null> {
  const p = new URLSearchParams();
  if (q.tu_khoa) p.set("tu_khoa", q.tu_khoa);
  if (q.gioi_han) p.set("gioi_han", String(q.gioi_han));
  if (q.sap_xep) p.set("sap_xep", q.sap_xep);
  const chuoi = p.toString();
  const { data } = await docJson<SanPhamCongKhai[]>(`/cong-khai/san-pham${chuoi ? `?${chuoi}` : ""}`);
  return data;
}

/** "khong-co" = 404/400 (trang notFound), null = loi ket noi */
export async function layChiTietSanPham(ma: string): Promise<ChiTietSanPhamCongKhai | "khong-co" | null> {
  const { status, data } = await docJson<ChiTietSanPhamCongKhai>(`/cong-khai/san-pham/${encodeURIComponent(ma)}`);
  if (status === 404 || status === 400) return "khong-co";
  return data;
}

/** Nguong hang the that (GET /api/khach-doi-tac/hang/cau-hinh — route cong khai); loi -> null (giu chu cho) */
export async function layCauHinhHang(): Promise<CauHinhHang[] | null> {
  const { data } = await docJson<CauHinhHang[]>("/khach-doi-tac/hang/cau-hinh");
  return data;
}
