"use client";

import { VAI_LIEN_HE_THAM_GIA, type GuiLienHeBody, type KetQuaLienHe, type LoTrinhDangKy, type VaiLienHeThamGia } from "@thien-khue/contracts";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { lopKicker, lopNhanTruong, lopO, lopThe, Nut, NutLienKet, ThongBaoNoiDong } from "@/components/ui";
import { api, LoiApi } from "@/lib/api";
import { cn } from "@/lib/cn";
import { laSdtVietNam } from "@/features/storefront/form-lien-he";
import { layMaGioiThieuDaLuu } from "@/features/storefront/ma-gioi-thieu";
import { OGach, VanBanGach } from "./truong-gach";

/*
 * Lien he tham gia (CTV / KOL / KOC / thuc tap sinh / doi tac). Khong tu tao tai khoan:
 * moi vai lay tu CRM, nhan vien Lyno goi lai roi tao tai khoan. Gui POST /api/cong-khai/lien-he (cong khai) -> lead.
 */

const NHAN_VAI_LIEN_HE: Record<VaiLienHeThamGia, string> = {
  CTV: "Cộng tác viên (CTV)",
  KOL: "KOL",
  KOC: "KOC",
  THUC_TAP: "Thực tập sinh",
  DOI_TAC: "Đối tác"
};

/** Lo trinh gui kem khi trang = DAO_TAO (API bat buoc) */
const LO_TRINH_THEO_VAI: Record<Exclude<VaiLienHeThamGia, "DOI_TAC">, LoTrinhDangKy> = {
  CTV: "ctv",
  KOL: "kol",
  KOC: "kol",
  THUC_TAP: "other"
};

/** ?vai=CTV|KOL|KOC|THUC_TAP|DOI_TAC (khong phan biet hoa thuong) + gia tri cu: thuc-tap, tts, doi-tac, ?lo-trinh=ctv|kol|thuc-tap */
function vaiTuThamSo(vai: string | null, loTrinh: string | null): VaiLienHeThamGia {
  const ma = (vai ?? loTrinh ?? "").trim().toUpperCase().replace(/-/g, "_");
  if (ma === "TTS") return "THUC_TAP";
  return (VAI_LIEN_HE_THAM_GIA as readonly string[]).includes(ma) ? (ma as VaiLienHeThamGia) : "CTV";
}

type LoiTruong = Partial<Record<"ho_ten" | "sdt", string>>;

const BUOC = [
  { so: "01", tieuDe: "Gửi thông tin", moTa: "Họ tên, số điện thoại / Zalo và vai trò bạn muốn tham gia." },
  { so: "02", tieuDe: "Nhân viên Lyno gọi lại", moTa: "Tư vấn quyền lợi, cách làm việc và xác nhận vai trò phù hợp với bạn." },
  { so: "03", tieuDe: "Nhận tài khoản", moTa: "Lyno tạo tài khoản và gán vai trò trên hệ thống, bạn đăng nhập để vào học và làm việc." }
];

export function FormDangKy() {
  const thamSo = useSearchParams();
  const [vai, setVai] = useState<VaiLienHeThamGia>(() => vaiTuThamSo(thamSo.get("vai"), thamSo.get("lo-trinh")));
  const [hoTen, setHoTen] = useState("");
  const [sdt, setSdt] = useState("");
  const [ghiChu, setGhiChu] = useState("");
  const [bay, setBay] = useState("");
  const [loiTruong, setLoiTruong] = useState<LoiTruong>({});
  const [loi, setLoi] = useState<string | null>(null);
  const [dangGui, setDangGui] = useState(false);
  const [daGui, setDaGui] = useState(false);

  function kiem(): LoiTruong {
    const l: LoiTruong = {};
    if (hoTen.trim().length < 2) l.ho_ten = "Nhập họ và tên";
    if (!sdt.trim()) l.sdt = "Nhập số điện thoại";
    else if (!laSdtVietNam(sdt)) l.sdt = "Số điện thoại chưa đúng (10 chữ số, ví dụ 0912 345 678)";
    return l;
  }

  async function gui(e: React.FormEvent) {
    e.preventDefault();
    setLoi(null);
    const l = kiem();
    setLoiTruong(l);
    if (Object.keys(l).length) return;
    const maGioiThieu = layMaGioiThieuDaLuu();
    const body: GuiLienHeBody = {
      ho_ten: hoTen.trim(),
      sdt: sdt.trim(),
      // API ghi nhu cau "Hình thức: <lua_chon>" (DAO_TAO) / "Hình thức quan tâm: <lua_chon>" (DOI_TAC)
      ...(vai === "DOI_TAC" ? { trang: "DOI_TAC" as const } : { trang: "DAO_TAO" as const, lo_trinh: LO_TRINH_THEO_VAI[vai] }),
      lua_chon: NHAN_VAI_LIEN_HE[vai],
      ...(ghiChu.trim() ? { loi_nhan: ghiChu.trim() } : {}),
      ...(maGioiThieu ? { ma_gioi_thieu: maGioiThieu } : {}),
      ...(bay ? { website: bay } : {}),
      dong_y_lien_he: true
    };
    setDangGui(true);
    try {
      await api.post<KetQuaLienHe>("/cong-khai/lien-he", body, { congKhai: true });
      setDaGui(true);
    } catch (err) {
      if (err instanceof LoiApi) {
        const chiTiet = Array.isArray(err.details) && typeof err.details[0] === "string" ? (err.details[0] as string) : null;
        setLoi(chiTiet ?? err.message);
      } else setLoi("Không gửi được, vui lòng thử lại");
    } finally {
      setDangGui(false);
    }
  }

  function guiLai() {
    setDaGui(false);
    setGhiChu("");
  }

  return (
    <div className="tk-up w-full max-w-tk">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <span className={lopKicker}>Liên hệ tham gia</span>
          <h1 className="m-0 text-h1 text-chu md:text-hien-thi">Trở thành một phần của đội ngũ</h1>
        </div>
        <div className="flex flex-col gap-4 rounded-xl border border-chinh/20 bg-chinh-nhat p-5 md:flex-row md:items-center md:justify-between md:px-6">
          <div className="flex flex-col gap-1">
            <span className="text-h3 text-chu">Tài khoản do Lyno cấp</span>
            <span className="text-sm text-chu-phu">
              LynoOS không cho tự đăng ký tài khoản. Gửi thông tin bên dưới, nhân viên Lyno sẽ gọi lại và tạo tài khoản cho bạn. Đã có tài khoản? Đăng nhập để tiếp tục.
            </span>
          </div>
          <NutLienKet href="/dang-nhap" kieu="vien" co="lon" className="shrink-0">
            Đăng nhập
          </NutLienKet>
        </div>
      </div>

      <section className="grid grid-cols-1 items-start gap-8 pb-16 pt-8 md:pt-10 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:gap-16">
        <div className="flex flex-col">
          <h2 className="mb-4 mt-0 text-h2 text-chu">Quy trình tham gia</h2>
          {BUOC.map(m => (
            <div key={m.so} className="grid grid-cols-[40px_minmax(0,1fr)] gap-4 border-t border-vien py-5">
              <span aria-hidden className="so flex h-10 w-10 items-center justify-center rounded-lg bg-chinh-nhat text-h4 text-chinh-dam">
                {m.so}
              </span>
              <div className="flex flex-col gap-1">
                <span className="text-h3 text-chu">{m.tieuDe}</span>
                <span className="text-sm text-chu-phu">{m.moTa}</span>
              </div>
            </div>
          ))}
          <div className="border-t border-vien pt-5 text-sm text-chu-phu">
            Vai trò trên hệ thống do Lyno gán theo phòng ban của bạn. CTV, KOL, KOC, thực tập sinh học và đạt bài kiểm tra (≥ 90%) trên Học viện để bắt đầu làm việc.
          </div>
        </div>

        <div className={cn(lopThe, "p-5 md:p-8")}>
          {daGui ? (
            <div className="flex flex-col gap-4 py-4" role="status" aria-live="polite">
              <span aria-hidden className="flex h-10 w-10 items-center justify-center rounded-lg bg-thanh-cong-nhat text-thanh-cong">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12.5l4.5 4.5L19 7.5" />
                </svg>
              </span>
              <h2 className="m-0 text-h2 text-chu">Cảm ơn bạn</h2>
              <p className="m-0 text-sm text-chu-phu">Đã nhận thông tin — nhân viên Lyno sẽ gọi lại và tạo tài khoản cho bạn trên hệ thống.</p>
              <div className="flex flex-wrap gap-3">
                <NutLienKet href="/dang-nhap" co="lon">
                  Đăng nhập
                </NutLienKet>
                <Nut kieu="vien" co="lon" onClick={guiLai}>
                  Gửi thông tin khác
                </Nut>
              </div>
              <p className="m-0 text-xs text-chu-mo">Nút Đăng nhập dành cho người đã được Lyno cấp tài khoản.</p>
            </div>
          ) : (
            <form onSubmit={gui} noValidate className="relative flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <h2 className="m-0 text-h2 text-chu">Gửi thông tin tham gia</h2>
                <p className="m-0 text-sm text-chu-phu">Nhân viên Lyno sẽ liên hệ qua số điện thoại hoặc Zalo bạn để lại.</p>
              </div>
              <OGach nhan="Họ và tên" batBuoc autoComplete="name" placeholder="Nguyễn Thị A" maxLength={100} value={hoTen} onChange={e => setHoTen(e.target.value)} loi={loiTruong.ho_ten} />
              <OGach
                nhan="Điện thoại / Zalo"
                batBuoc
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="09xx xxx xxx"
                maxLength={20}
                value={sdt}
                onChange={e => setSdt(e.target.value)}
                loi={loiTruong.sdt}
              />
              <ChonVai vai={vai} doi={setVai} />
              <VanBanGach
                nhan="Ghi chú"
                placeholder="Kinh nghiệm, kênh bán hàng / mạng xã hội, thời gian có thể làm…"
                value={ghiChu}
                onChange={e => setGhiChu(e.target.value)}
                maxLength={1000}
              />

              {/* Bay chong spam: an khoi nguoi dung va trinh doc man hinh; bot tu dien se bi bo qua o server */}
              <div aria-hidden="true" className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden">
                <label htmlFor="lien-he-tham-gia-web">Website</label>
                <input id="lien-he-tham-gia-web" type="text" name="website" tabIndex={-1} autoComplete="off" value={bay} onChange={e => setBay(e.target.value)} />
              </div>

              {loi && <ThongBaoNoiDong kieu="loi">{loi}</ThongBaoNoiDong>}
              <Nut type="submit" co="lon" rongHet dangXuLy={dangGui} className="mt-2">
                Gửi thông tin tham gia
              </Nut>
              <p className="m-0 text-xs text-chu-mo">Thông tin chỉ dùng để Lyno liên hệ tư vấn và tạo tài khoản cho bạn trên LynoOS.</p>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}

function ChonVai({ vai, doi }: { vai: VaiLienHeThamGia; doi: (v: VaiLienHeThamGia) => void }) {
  return (
    <label htmlFor="lien-he-tham-gia-vai" className={cn(lopNhanTruong, "flex flex-col gap-2")}>
      <span>
        Vai trò mong muốn<span className="text-loi"> *</span>
      </span>
      <select
        id="lien-he-tham-gia-vai"
        value={vai}
        onChange={e => doi(e.target.value as VaiLienHeThamGia)}
        className={cn(lopO, "cursor-pointer font-normal")}
      >
        {VAI_LIEN_HE_THAM_GIA.map(v => (
          <option key={v} value={v}>
            {NHAN_VAI_LIEN_HE[v]}
          </option>
        ))}
      </select>
    </label>
  );
}
