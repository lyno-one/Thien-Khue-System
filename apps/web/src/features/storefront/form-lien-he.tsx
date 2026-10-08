"use client";

import { useId, useState } from "react";
import type { GuiLienHeBody, KetQuaLienHe, LoTrinhDangKy, TrangLienHe } from "@thien-khue/contracts";
import { lopNhanTruong, lopO, Nut } from "@/components/ui";
import { api, LoiApi } from "@/lib/api";
import { layMaGioiThieuDaLuu } from "./ma-gioi-thieu";
import type { CauHinhForm } from "./noi-dung";

/*
 * Form dang ky / lien he tren trang cong khai — o nhap / nut theo he trang xanh CRM (lopO, Nut).
 * POST /api/cong-khai/lien-he (route @CongKhai, khong gan token) -> lead.
 * Chong spam phia client: o bay `website` an khoi nguoi that; SDT kiem truoc khi gui (server kiem lai).
 */

/** Giong chuanHoaSdt cua API / CRM: bo ky tu khac so, 84... -> 0..., 9 so -> them 0 */
export function chuanHoaSdt(sdt: string): string {
  const raw = sdt.replace(/\D/g, "");
  if (raw.startsWith("84") && raw.length > 9) return "0" + raw.slice(2);
  if (raw.length === 9) return "0" + raw;
  return raw;
}

export function laSdtVietNam(sdt: string): boolean {
  return /^0[235789]\d{8}$/.test(chuanHoaSdt(sdt));
}

interface Props {
  trang: TrangLienHe;
  form: CauHinhForm;
  loTrinh?: LoTrinhDangKy;
  maMauQuanTam?: string;
  /** Cau phu duoi tieu de */
  moTa?: string;
}

type LoiTruong = Partial<Record<"ho_ten" | "sdt" | "email", string>>;

const LOP_NHAN = `flex flex-col gap-1.5 ${lopNhanTruong}`;
const LOP_LOI = "text-caption text-loi";
// Nhan boc o nhap nen o phai tra lai do dam thuong (preflight cho input ke thua font-weight)
const LOP_O = `${lopO} font-normal`;

export function FormLienHe({ trang, form, loTrinh, maMauQuanTam, moTa }: Props) {
  const id = useId();
  const [hoTen, setHoTen] = useState("");
  const [sdt, setSdt] = useState("");
  const [email, setEmail] = useState("");
  const [luaChon, setLuaChon] = useState(form.options[0] ?? "");
  const [loiNhan, setLoiNhan] = useState("");
  const [bay, setBay] = useState("");
  const [loi, setLoi] = useState<LoiTruong>({});
  const [loiChung, setLoiChung] = useState<string | null>(null);
  const [dangGui, setDangGui] = useState(false);
  const [ketQua, setKetQua] = useState<KetQuaLienHe | null>(null);

  function kiem(): LoiTruong {
    const l: LoiTruong = {};
    if (hoTen.trim().length < 2) l.ho_ten = "Vui lòng nhập họ và tên";
    if (!sdt.trim()) l.sdt = "Vui lòng nhập số điện thoại";
    else if (!laSdtVietNam(sdt)) l.sdt = "Số điện thoại chưa đúng (10 chữ số, ví dụ 0912 345 678)";
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) l.email = "Email chưa đúng";
    return l;
  }

  async function gui(e: React.FormEvent) {
    e.preventDefault();
    const l = kiem();
    setLoi(l);
    setLoiChung(null);
    if (Object.keys(l).length) return;
    const body: GuiLienHeBody = {
      ho_ten: hoTen.trim(),
      sdt: sdt.trim(),
      trang,
      ...(email.trim() ? { email: email.trim() } : {}),
      ...(loTrinh ? { lo_trinh: loTrinh } : {}),
      ...(luaChon ? { lua_chon: luaChon } : {}),
      ...(loiNhan.trim() ? { loi_nhan: loiNhan.trim() } : {}),
      ...(maMauQuanTam ? { ma_mau_quan_tam: maMauQuanTam } : {}),
      ...(layMaGioiThieuDaLuu() ? { ma_gioi_thieu: layMaGioiThieuDaLuu()! } : {}),
      ...(bay ? { website: bay } : {}),
      dong_y_lien_he: true
    };
    setDangGui(true);
    try {
      setKetQua(await api.post<KetQuaLienHe>("/cong-khai/lien-he", body, { congKhai: true }));
    } catch (err) {
      if (err instanceof LoiApi) {
        const chiTiet = Array.isArray(err.details) && typeof err.details[0] === "string" ? (err.details[0] as string) : null;
        setLoiChung(chiTiet ?? err.message);
      } else setLoiChung("Không gửi được, vui lòng thử lại");
    } finally {
      setDangGui(false);
    }
  }

  function guiKhac() {
    setKetQua(null);
    setLoiNhan("");
  }

  if (ketQua) {
    return (
      <div className="flex flex-col gap-4 py-6" role="status" aria-live="polite">
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden className="text-chinh">
          <path d="M20 3 L37 20 L20 37 L3 20 Z" />
          <path d="M13 20l5 5 9-10" />
        </svg>
        <h2 className="m-0 text-h2 text-chu">Cảm ơn bạn</h2>
        <p className="m-0 text-body-lg text-chu-phu">
          Chúng tôi đã nhận đăng ký và sẽ liên hệ qua số điện thoại hoặc Zalo bạn để lại. Tài khoản (nếu cần) do Lyno tạo sau khi liên hệ.
        </p>
        <Nut kieu="vien" onClick={guiKhac} className="self-start">
          Gửi đăng ký khác
        </Nut>
      </div>
    );
  }

  return (
    <form onSubmit={gui} noValidate className="relative flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <h2 className="m-0 text-h2 text-chu">{form.title}</h2>
        <p className="m-0 text-body text-chu-phu">{moTa ?? "Đội ngũ Thiên Khuê S sẽ liên hệ trong [thời gian phản hồi]."}</p>
      </div>

      <label htmlFor={`${id}-ten`} className={LOP_NHAN}>
        Họ và tên
        <input
          id={`${id}-ten`}
          type="text"
          autoComplete="name"
          placeholder="Nguyễn Thị A"
          value={hoTen}
          onChange={e => setHoTen(e.target.value)}
          maxLength={100}
          aria-invalid={!!loi.ho_ten}
          aria-describedby={loi.ho_ten ? `${id}-ten-loi` : undefined}
          className={LOP_O}
        />
        {loi.ho_ten && (
          <span id={`${id}-ten-loi`} className={LOP_LOI}>
            {loi.ho_ten}
          </span>
        )}
      </label>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <label htmlFor={`${id}-sdt`} className={LOP_NHAN}>
          Điện thoại / Zalo
          <input
            id={`${id}-sdt`}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="09xx xxx xxx"
            value={sdt}
            onChange={e => setSdt(e.target.value)}
            maxLength={20}
            aria-invalid={!!loi.sdt}
            aria-describedby={loi.sdt ? `${id}-sdt-loi` : undefined}
            className={LOP_O}
          />
          {loi.sdt && (
            <span id={`${id}-sdt-loi`} className={LOP_LOI}>
              {loi.sdt}
            </span>
          )}
        </label>
        <label htmlFor={`${id}-email`} className={LOP_NHAN}>
          Email
          <input
            id={`${id}-email`}
            type="email"
            autoComplete="email"
            placeholder="ban@email.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            maxLength={150}
            aria-invalid={!!loi.email}
            aria-describedby={loi.email ? `${id}-email-loi` : undefined}
            className={LOP_O}
          />
          {loi.email && (
            <span id={`${id}-email-loi`} className={LOP_LOI}>
              {loi.email}
            </span>
          )}
        </label>
      </div>

      <label htmlFor={`${id}-chon`} className={LOP_NHAN}>
        {form.selectLabel}
        <select id={`${id}-chon`} value={luaChon} onChange={e => setLuaChon(e.target.value)} className={`${LOP_O} cursor-pointer`}>
          {form.options.map(o => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </label>

      <label htmlFor={`${id}-ghi-chu`} className={LOP_NHAN}>
        {form.noteLabel}
        <textarea
          id={`${id}-ghi-chu`}
          rows={3}
          placeholder="Chia sẻ thêm với chúng tôi…"
          value={loiNhan}
          onChange={e => setLoiNhan(e.target.value)}
          maxLength={1000}
          className={`${LOP_O} resize-y`}
        />
      </label>

      {/* Bay chong spam: an khoi nguoi dung va trinh doc man hinh; bot tu dien se bi bo qua o server */}
      <div aria-hidden="true" className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden">
        <label htmlFor={`${id}-web`}>Website</label>
        <input id={`${id}-web`} type="text" name="website" tabIndex={-1} autoComplete="off" value={bay} onChange={e => setBay(e.target.value)} />
      </div>

      {loiChung && (
        <p role="alert" className="m-0 rounded-lg bg-loi-nhat px-4 py-3 text-body text-loi">
          {loiChung}
        </p>
      )}

      <Nut type="submit" co="lon" rongHet dangXuLy={dangGui}>
        {form.cta}
      </Nut>
      <p className="m-0 text-caption text-chu-mo">Thông tin chỉ dùng để liên hệ tư vấn và xét duyệt vai trò trên Thiên Khuê S.</p>
    </form>
  );
}
