"use client";

import type { ChinhSachHienHanh, DeXuatDuyet, LoaiDeXuat, NguoiDungDongQt, PhanTrangMeta, SanPhamDongQt, TaoDeXuatBody, Vai } from "@thien-khue/contracts";
import { DANH_SACH_VAI, NHAN_LOAI_DE_XUAT, NHAN_VAI, nhanSoBuocDeXuat, soBuocDeXuat, VAI_PHAI_HOC, VAI_TU_CRM } from "@thien-khue/contracts";
import { useEffect, useState } from "react";
import { HopThoai, lopDongBam, lopTab, lopThanhTab, Nut, OChon, ONhap, OVanBan, ThongBaoNoiDong } from "@/components/ui";
import { api, thongDiepLoi } from "@/lib/api";
import { cn } from "@/lib/cn";
import { dinhDangTien } from "@/lib/dinh-dang";
import { tenVai } from "./dung-chung";

/*
 * Lap de xuat (nguoi de xuat = maker). 2 buoc: nguoi duyet khac nguoi de xuat. 3 buoc (chi tra hoa hong): them nguoi kiem — server chan.
 * Chuyen vai chi cho vai CRM khong co (CTV, TTS, KOL, KOC, Mentor, Doi tac...) — Sale / CSKH / Quan ly / Admin doi o CRM.
 * Loai lap tay: chuyen vai, cap / thu hoi quyen SKU, doi chinh sach (ty le hoa hong, nguong hang), chi tra hoa hong theo ky, khac.
 * Qua tang / voucher / don trung nguon: lap tu tab "Hàng chờ".
 */

type LoaiForm = "CHUYEN_VAI" | "CAP_QUYEN_SKU" | "DOI_CHINH_SACH" | "CHI_TRA_HOA_HONG" | "KHAC";
const LOAI_FORM: LoaiForm[] = ["CHUYEN_VAI", "CAP_QUYEN_SKU", "DOI_CHINH_SACH", "CHI_TRA_HOA_HONG", "KHAC"];

/** Ky "YYYY-MM" hien tai theo gio Viet Nam */
function kyHienTai(): string {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit" }).formatToParts(new Date());
  return `${p.find(x => x.type === "year")?.value}-${p.find(x => x.type === "month")?.value}`;
}
const VAI_HOA_HONG: Vai[] = ["SALE", "CSKH", "CTV", "THUC_TAP", "KOL", "KOC"];
/** Vai cap / chuyen duoc bang de xuat: bo vai lay tu CRM */
const VAI_DE_XUAT: Vai[] = DANH_SACH_VAI.filter(v => !VAI_TU_CRM.includes(v));

export interface MacDinhDeXuat {
  loai?: LoaiForm;
  hoSo?: { id: string; ho_ten: string };
}

export function FormDeXuat({ mo, dong, xong, macDinh }: { mo: boolean; dong: () => void; xong: (dx: DeXuatDuyet) => void; macDinh?: MacDinhDeXuat }) {
  const [loai, setLoai] = useState<LoaiForm>(macDinh?.loai ?? "CHUYEN_VAI");
  const [hoSo, setHoSo] = useState<{ id: string; ho_ten: string } | null>(macDinh?.hoSo ?? null);
  const [vai, setVai] = useState<Vai>("KOC");
  const [trangThaiVai, setTrangThaiVai] = useState("DANG_HOC");
  const [tuVai, setTuVai] = useState<string>("");
  const [sanPham, setSanPham] = useState<{ id: string; ma: string; ten: string } | null>(null);
  const [hanhDongSku, setHanhDongSku] = useState<"HOAT_DONG" | "THU_HOI">("HOAT_DONG");
  const [chinhSach, setChinhSach] = useState<"TY_LE_HOA_HONG" | "NGUONG_HANG">("TY_LE_HOA_HONG");
  const [vaiHh, setVaiHh] = useState<Vai>("SALE");
  const [tyLe, setTyLe] = useState("");
  const [hang, setHang] = useState<"THAN_THIET" | "VIP">("THAN_THIET");
  const [nguong, setNguong] = useState("");
  const [giam, setGiam] = useState("");
  const [moTaKhac, setMoTaKhac] = useState("");
  const [kyChiTra, setKyChiTra] = useState(kyHienTai);
  const [lyDo, setLyDo] = useState("");
  const [dangGui, setDangGui] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);
  const [cs, setCs] = useState<ChinhSachHienHanh | null>(null);

  useEffect(() => {
    if (!mo) return;
    setLoai(macDinh?.loai ?? "CHUYEN_VAI");
    setHoSo(macDinh?.hoSo ?? null);
    setLoi(null);
  }, [mo, macDinh]);

  useEffect(() => {
    if (mo && loai === "DOI_CHINH_SACH" && !cs) api.get<ChinhSachHienHanh>("/quan-tri/phe-duyet/chinh-sach").then(setCs).catch(() => undefined);
  }, [mo, loai, cs]);

  useEffect(() => {
    setTrangThaiVai(VAI_PHAI_HOC.includes(vai) ? "DANG_HOC" : "HOAT_DONG");
  }, [vai]);

  const tyLeHienTai = cs?.ty_le_hoa_hong.find(t => t.vai === vaiHh && !t.mau_id)?.ty_le;
  const hangHienTai = cs?.hang_thanh_vien.find(h => h.hang === hang);

  function taoBody(): TaoDeXuatBody | string {
    const ly_do = lyDo.trim() || undefined;
    if (loai === "CHUYEN_VAI") {
      if (!hoSo) return "Chọn hồ sơ cần chuyển vai";
      return { loai, doi_tuong_id: hoSo.id, du_lieu: { vai, trang_thai_moi: trangThaiVai, ...(tuVai ? { tu_vai: tuVai } : {}) }, ly_do };
    }
    if (loai === "CAP_QUYEN_SKU") {
      if (!hoSo) return "Chọn hồ sơ";
      if (!sanPham) return "Chọn sản phẩm (mã SKU)";
      return { loai, doi_tuong_id: hoSo.id, du_lieu: { mau_id: sanPham.id, trang_thai_moi: hanhDongSku }, ly_do };
    }
    if (loai === "DOI_CHINH_SACH") {
      if (!ly_do) return "Thay đổi chính sách cần ghi lý do";
      if (chinhSach === "TY_LE_HOA_HONG") {
        if (tyLe.trim() === "") return "Nhập tỷ lệ mới";
        return { loai, du_lieu: { chinh_sach: chinhSach, vai: vaiHh, ty_le: Number(tyLe) }, ly_do };
      }
      if (nguong.trim() === "" && giam.trim() === "") return "Nhập ngưỡng hoặc mức giảm mới";
      return {
        loai,
        du_lieu: { chinh_sach: chinhSach, hang, ...(nguong.trim() ? { nguong_tich_luy: Number(nguong.replace(/\D/g, "")) } : {}), ...(giam.trim() ? { giam_gia_phan_tram: Number(giam) } : {}) },
        ly_do
      };
    }
    if (loai === "CHI_TRA_HOA_HONG") {
      const ky = kyChiTra.trim();
      if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(ky)) return "Kỳ chi trả dạng YYYY-MM, vd 2026-10";
      return { loai, du_lieu: { ky, ...(hoSo ? { ho_so_id: hoSo.id } : {}) }, ly_do };
    }
    if (!moTaKhac.trim()) return "Mô tả nội dung đề xuất";
    return { loai: "KHAC", doi_tuong: "khac", du_lieu: { noi_dung: moTaKhac.trim() }, ly_do };
  }

  async function gui() {
    const body = taoBody();
    if (typeof body === "string") {
      setLoi(body);
      return;
    }
    setDangGui(true);
    setLoi(null);
    try {
      const dx = await api.post<DeXuatDuyet>("/quan-tri/de-xuat", body);
      setLyDo("");
      setTyLe("");
      setNguong("");
      setGiam("");
      setMoTaKhac("");
      setSanPham(null);
      xong(dx);
    } catch (e) {
      setLoi(thongDiepLoi(e));
    } finally {
      setDangGui(false);
    }
  }

  return (
    <HopThoai
      mo={mo}
      dong={dong}
      rong="lon"
      tieuDe="Lập đề xuất"
      moTa={
        soBuocDeXuat(loai) === 3
          ? "Đề xuất về tiền (3 bước): bạn đề xuất, một người khác kiểm, rồi người thứ ba có thẩm quyền mới duyệt."
          : "Đề xuất 2 bước: bạn đề xuất, một người có thẩm quyền khác duyệt."
      }
      chanTrang={
        <>
          <Nut kieu="trong" onClick={dong}>
            Huỷ
          </Nut>
          <Nut onClick={() => void gui()} dangXuLy={dangGui}>
            Gửi đề xuất
          </Nut>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <div role="radiogroup" aria-label="Loại đề xuất" className={lopThanhTab}>
          {LOAI_FORM.map(l => (
            <button
              key={l}
              type="button"
              role="radio"
              aria-checked={loai === l}
              onClick={() => setLoai(l)}
              className={lopTab(loai === l)}
            >
              {NHAN_LOAI_DE_XUAT[l as LoaiDeXuat]}
              <span className="ml-1 text-xs opacity-70">· {nhanSoBuocDeXuat(l as LoaiDeXuat)}</span>
            </button>
          ))}
        </div>

        {(loai === "CHUYEN_VAI" || loai === "CAP_QUYEN_SKU") && <ChonHoSo chon={hoSo} doi={setHoSo} />}

        {loai === "CHI_TRA_HOA_HONG" && (
          <>
            <ONhap nhan="Kỳ chi trả (YYYY-MM)" inputMode="numeric" placeholder="2026-10" value={kyChiTra} onChange={e => setKyChiTra(e.target.value)} goiY="Gồm mọi khoản đủ điều kiện từ kỳ này trở về trước, chưa nằm trong đề xuất chi trả khác." />
            <ChonHoSo chon={hoSo} doi={setHoSo} />
            <ThongBaoNoiDong kieu="canh-bao">
              Bỏ trống hồ sơ để chi trả cho tất cả. Hệ thống chốt danh sách khoản lúc lập; khi Thiên Khuê duyệt, các khoản chuyển sang “Đã trả” — khoản nào đã trả hoặc bị trừ trong lúc chờ thì đề xuất không áp dụng, cần lập lại. Người nhận tiền không được lập, kiểm hay duyệt.
            </ThongBaoNoiDong>
          </>
        )}

        {loai === "CHUYEN_VAI" && (
          <ThongBaoNoiDong kieu="thong-tin">
            Vai Sale, CSKH, Quản lý, Admin lấy từ CRM — đổi ở CRM (Quản trị nhân sự). Thực tập sinh học đạt khoá CTV được hệ thống tự thêm vai CTV, không cần đề xuất.
          </ThongBaoNoiDong>
        )}

        {loai === "CHUYEN_VAI" && (
          <div className="grid gap-4 sm:grid-cols-3">
            <OChon nhan="Vai" value={vai} onChange={e => setVai(e.target.value as Vai)} luaChon={VAI_DE_XUAT.map(v => ({ giaTri: v, nhan: NHAN_VAI[v] }))} />
            <OChon
              nhan="Trạng thái mới"
              value={trangThaiVai}
              onChange={e => setTrangThaiVai(e.target.value)}
              luaChon={[
                { giaTri: "DANG_HOC", nhan: "Đang học" },
                { giaTri: "HOAT_DONG", nhan: "Hoạt động" },
                { giaTri: "TAM_DUNG", nhan: "Tạm dừng" },
                { giaTri: "KET_THUC", nhan: "Kết thúc" }
              ]}
              goiY={VAI_PHAI_HOC.includes(vai) ? "Vai phải học: chỉ hoạt động khi học và thi đạt ≥ 90%." : undefined}
            />
            <OChon nhan="Kết thúc vai cũ (tuỳ chọn)" value={tuVai} onChange={e => setTuVai(e.target.value)} goiYChon="Không" luaChon={VAI_DE_XUAT.filter(v => v !== vai).map(v => ({ giaTri: v, nhan: NHAN_VAI[v] }))} />
          </div>
        )}

        {loai === "CAP_QUYEN_SKU" && (
          <>
            <ChonSanPham chon={sanPham} doi={setSanPham} />
            <OChon
              nhan="Hành động"
              value={hanhDongSku}
              onChange={e => setHanhDongSku(e.target.value as "HOAT_DONG" | "THU_HOI")}
              luaChon={[
                { giaTri: "HOAT_DONG", nhan: "Cấp quyền bán (cần bằng chứng học đạt)" },
                { giaTri: "THU_HOI", nhan: "Thu hồi quyền bán" }
              ]}
              goiY="Cấp quyền chỉ được khi hồ sơ đã thi đạt khoá sản phẩm (đúng phiên bản tài liệu) và bài thực hành được duyệt nếu khoá yêu cầu."
            />
          </>
        )}

        {loai === "DOI_CHINH_SACH" && (
          <>
            <OChon
              nhan="Chính sách"
              value={chinhSach}
              onChange={e => setChinhSach(e.target.value as "TY_LE_HOA_HONG" | "NGUONG_HANG")}
              luaChon={[
                { giaTri: "TY_LE_HOA_HONG", nhan: "Tỷ lệ hoa hồng theo vai" },
                { giaTri: "NGUONG_HANG", nhan: "Ngưỡng hạng thẻ thành viên" }
              ]}
            />
            {chinhSach === "TY_LE_HOA_HONG" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <OChon nhan="Vai" value={vaiHh} onChange={e => setVaiHh(e.target.value as Vai)} luaChon={VAI_HOA_HONG.map(v => ({ giaTri: v, nhan: NHAN_VAI[v] }))} />
                <ONhap
                  nhan="Tỷ lệ mới (%)"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  max={100}
                  step="0.01"
                  value={tyLe}
                  onChange={e => setTyLe(e.target.value)}
                  goiY={tyLeHienTai !== undefined ? `Hiện hành: ${tyLeHienTai}%` : "Chưa có tỷ lệ chung cho vai này"}
                />
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-3">
                <OChon nhan="Hạng" value={hang} onChange={e => setHang(e.target.value as "THAN_THIET" | "VIP")} luaChon={[{ giaTri: "THAN_THIET", nhan: "Thân thiết" }, { giaTri: "VIP", nhan: "VIP" }]} />
                <ONhap nhan="Ngưỡng tích luỹ mới (đ)" inputMode="numeric" value={nguong} onChange={e => setNguong(e.target.value)} goiY={hangHienTai ? `Hiện hành: ${dinhDangTien(hangHienTai.nguong_tich_luy)}` : undefined} />
                <ONhap nhan="Giảm giá mới (%)" type="number" min={0} max={100} step="0.01" value={giam} onChange={e => setGiam(e.target.value)} goiY={hangHienTai ? `Hiện hành: ${hangHienTai.giam_gia_phan_tram}%` : undefined} />
              </div>
            )}
            <ThongBaoNoiDong kieu="canh-bao">Thay đổi chính sách chỉ Thiên Khuê được duyệt và áp dụng ngay khi duyệt; tỷ lệ cũ được giữ lại trong lịch sử.</ThongBaoNoiDong>
          </>
        )}

        {loai === "KHAC" && <OVanBan nhan="Nội dung đề xuất" batBuoc value={moTaKhac} onChange={e => setMoTaKhac(e.target.value)} goiY="Đề xuất loại này chỉ ghi quyết định, không tự áp dụng thay đổi." />}

        <OVanBan nhan="Lý do" value={lyDo} onChange={e => setLyDo(e.target.value)} rows={3} batBuoc={loai === "DOI_CHINH_SACH"} />

        {loi && <ThongBaoNoiDong kieu="canh-bao">{loi}</ThongBaoNoiDong>}
      </div>
    </HopThoai>
  );
}

/** Tim + chon mot ho so (nguoi dung) */
export function ChonHoSo({ chon, doi }: { chon: { id: string; ho_ten: string } | null; doi: (h: { id: string; ho_ten: string } | null) => void }) {
  const [tk, setTk] = useState("");
  const [ds, setDs] = useState<NguoiDungDongQt[]>([]);
  const [dangTim, setDangTim] = useState(false);

  useEffect(() => {
    const q = tk.trim();
    if (q.length < 2) {
      setDs([]);
      return;
    }
    const h = setTimeout(() => {
      setDangTim(true);
      api
        .layCoMeta<NguoiDungDongQt[], PhanTrangMeta>("/quan-tri/ho-so/nguoi-dung", { tu_khoa: q, so_dong: 8 })
        .then(r => setDs(r.data))
        .catch(() => setDs([]))
        .finally(() => setDangTim(false));
    }, 300);
    return () => clearTimeout(h);
  }, [tk]);

  if (chon) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-vien bg-be-mat-phu px-4 py-3">
        <span className="text-sm text-chu-phu">
          Hồ sơ: <strong className="text-chu">{chon.ho_ten}</strong>
        </span>
        <Nut kieu="trong" co="nho" onClick={() => doi(null)}>
          Đổi
        </Nut>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      <ONhap nhan="Hồ sơ" placeholder="Gõ họ tên, email hoặc SĐT…" value={tk} onChange={e => setTk(e.target.value)} goiY={dangTim ? "Đang tìm…" : undefined} />
      {ds.length > 0 && (
        <ul className="cuon-mong m-0 flex max-h-[220px] list-none flex-col divide-y divide-vien overflow-y-auto rounded-lg border border-vien bg-be-mat p-0">
          {ds.map(h => (
            <li key={h.id}>
              <button type="button" onClick={() => doi({ id: h.id, ho_ten: h.ho_ten })} className={cn(lopDongBam, "flex min-h-[44px] w-full flex-wrap items-center justify-between gap-2 py-2 text-left text-sm")}>
                <span className="font-medium text-chu">{h.ho_ten}</span>
                <span className="text-xs text-chu-phu">{[h.email, h.vai.map(v => tenVai(v.vai)).join(", ")].filter(Boolean).join(" · ")}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ChonSanPham({ chon, doi }: { chon: { id: string; ma: string; ten: string } | null; doi: (s: { id: string; ma: string; ten: string } | null) => void }) {
  const [tk, setTk] = useState("");
  const [ds, setDs] = useState<SanPhamDongQt[]>([]);

  useEffect(() => {
    const q = tk.trim();
    if (q.length < 2) {
      setDs([]);
      return;
    }
    const h = setTimeout(() => {
      api
        .layCoMeta<SanPhamDongQt[], unknown>("/quan-tri/ho-so/san-pham", { tu_khoa: q, so_dong: 8 })
        .then(r => setDs(r.data))
        .catch(() => setDs([]));
    }, 300);
    return () => clearTimeout(h);
  }, [tk]);

  if (chon) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-vien bg-be-mat-phu px-4 py-3">
        <span className="text-sm text-chu-phu">
          Sản phẩm: <strong className="text-chu">{chon.ma}</strong> · {chon.ten}
        </span>
        <Nut kieu="trong" co="nho" onClick={() => doi(null)}>
          Đổi
        </Nut>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      <ONhap nhan="Sản phẩm (SKU)" placeholder="Gõ mã hoặc tên, vd AL01" value={tk} onChange={e => setTk(e.target.value)} />
      {ds.length > 0 && (
        <ul className="cuon-mong m-0 flex max-h-[220px] list-none flex-col divide-y divide-vien overflow-y-auto rounded-lg border border-vien bg-be-mat p-0">
          {ds.map(s => (
            <li key={s.id}>
              <button type="button" onClick={() => doi({ id: s.id, ma: s.ma, ten: s.ten })} className={cn(lopDongBam, "flex min-h-[44px] w-full items-center justify-between gap-2 py-2 text-left text-sm")}>
                <span>
                  <strong className="font-mono text-xs text-chu-phu">{s.ma}</strong> <span className="text-chu">· {s.ten}</span>
                </span>
                <span className="text-xs text-chu-phu">{s.khoa_hoc ? "Có khoá học" : "Chưa có khoá học"}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
