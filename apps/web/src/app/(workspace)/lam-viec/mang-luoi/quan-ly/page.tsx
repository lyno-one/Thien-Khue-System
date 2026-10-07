"use client";

import { useState } from "react";
import {
  NHAN_NGUON_DON_ML,
  NHAN_TRANG_THAI_CHIEN_DICH,
  type ChienDichQuanLy,
  type GhiNhanDonMl,
  type KetQuaDongBoMl,
  type NoiDungKocMl,
  type PhanTrangMeta,
  type ThamGiaChienDichMl,
  type TrangThaiChienDichMl,
  type XacMinhDonBody
} from "@thien-khue/contracts";
import { Bang, DangTai, HopThoai, Loi, lopTab, lopThanhTab, Nut, OChon, OLuaChon, ONhap, OVanBan, The, TheTieuDe, ThongBaoNoiDong, TieuDeTrang, Trong } from "@/components/ui";
import { NhanChienDich, NhanGhiNhan, NhanNoiDung, NhanThamGia, useTaiMl, useVaiMangLuoi } from "@/features/mang-luoi/chung";
import { api, thongDiepLoi } from "@/lib/api";
import { dinhDangNgay, dinhDangNgayGio, dinhDangTien } from "@/lib/dinh-dang";

type Tab = "don" | "chien-dich" | "noi-dung" | "dieu-chinh";
type ThongBao = { kieu: "thanh-cong" | "canh-bao"; chu: string } | null;

/** Ban dieu hanh mang luoi cho QUAN_LY / Thien Khue: xac minh don, dong bo, chien dich, duyet noi dung, dieu chinh */
export default function TrangQuanLyMangLuoi() {
  const q = useVaiMangLuoi();
  const [tab, setTab] = useState<Tab>("don");
  if (!q.quanLy) return <Trong tieuDe="Khu này dành cho người phụ trách" />;
  return (
    <>
      <TieuDeTrang kicker="Người phụ trách" tieuDe="Điều hành mạng lưới" moTa="Xác minh đơn trùng nguồn, đồng bộ trạng thái đơn CRM, quản lý chiến dịch KOL / KOC và điều chỉnh hoa hồng." />
      <div className="cuon-mong mb-6 overflow-x-auto">
        <div className={`${lopThanhTab} min-w-max flex-nowrap`}>
          {(
            [
              ["don", "Đơn & xác minh"],
              ["chien-dich", "Chiến dịch"],
              ["noi-dung", "Duyệt nội dung"],
              ["dieu-chinh", "Điều chỉnh hoa hồng"]
            ] as [Tab, string][]
          ).map(([k, nhan]) => (
            <button key={k} type="button" aria-pressed={tab === k} onClick={() => setTab(k)} className={lopTab(tab === k)}>
              {nhan}
            </button>
          ))}
        </div>
      </div>
      {tab === "don" ? <KhuDon /> : tab === "chien-dich" ? <KhuChienDich /> : tab === "noi-dung" ? <KhuNoiDung /> : <KhuDieuChinh />}
    </>
  );
}

// ------------------------------------------------------------------ don

function KhuDon() {
  const [loc, setLoc] = useState<"CHO_XAC_MINH" | "">("CHO_XAC_MINH");
  const ds = useTaiMl(() => api.layCoMeta<GhiNhanDonMl[], PhanTrangMeta>("/mang-luoi/quan-ly/ghi-nhan", { trang_thai: loc || undefined, so_dong: 50 }), [loc]);
  const [tb, setTb] = useState<ThongBao>(null);
  const [dongBo, setDongBo] = useState<KetQuaDongBoMl | null>(null);
  const [dangXuLy, setDangXuLy] = useState(false);
  const [xm, setXm] = useState<{ d: GhiNhanDonMl; chon: XacMinhDonBody["chon"]; ly_do: string } | null>(null);
  const [maDon, setMaDon] = useState({ ma_don: "", ma_gioi_thieu: "" });

  async function chayDongBo() {
    setDangXuLy(true);
    setTb(null);
    try {
      setDongBo(await api.post<KetQuaDongBoMl>("/mang-luoi/quan-ly/dong-bo"));
      await ds.taiLai();
    } catch (e) {
      setTb({ kieu: "canh-bao", chu: thongDiepLoi(e) });
    } finally {
      setDangXuLy(false);
    }
  }

  async function ghiNhan() {
    setDangXuLy(true);
    setTb(null);
    try {
      const kq = await api.post<GhiNhanDonMl>("/mang-luoi/ghi-nhan/don", { ma_don: maDon.ma_don.trim(), ma_gioi_thieu: maDon.ma_gioi_thieu.trim() || undefined });
      setTb({ kieu: "thanh-cong", chu: `Đơn ${kq.ma_don}: ${kq.trang_thai === "CHO_XAC_MINH" ? "chờ xác minh" : "đã ghi nhận"}.` });
      setMaDon({ ma_don: "", ma_gioi_thieu: "" });
      await ds.taiLai();
    } catch (e) {
      setTb({ kieu: "canh-bao", chu: thongDiepLoi(e) });
    } finally {
      setDangXuLy(false);
    }
  }

  async function xacMinh() {
    if (!xm) return;
    setDangXuLy(true);
    try {
      await api.post(`/mang-luoi/quan-ly/ghi-nhan/${xm.d.id}/xac-minh`, { chon: xm.chon, ly_do: xm.ly_do });
      setTb({ kieu: "thanh-cong", chu: `Đã gửi đề xuất xác minh đơn ${xm.d.ma_don}. Đơn chỉ được ghi nhận sau khi một người khác kiểm và Quản trị viên / Thiên Khuê duyệt ở bàn phê duyệt.` });
      setXm(null);
      await ds.taiLai();
    } catch (e) {
      setTb({ kieu: "canh-bao", chu: thongDiepLoi(e) });
      setXm(null);
    } finally {
      setDangXuLy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {tb && <ThongBaoNoiDong kieu={tb.kieu}>{tb.chu}</ThongBaoNoiDong>}
      <div className="grid gap-6 lg:grid-cols-2">
        <The>
          <TheTieuDe kicker="CRM" tieuDe="Đồng bộ đơn" moTa="Quét lại đơn: giao thành công → đủ điều kiện; hoàn / huỷ → bị trừ. Job định kỳ bật bằng biến MANG_LUOI_DONG_BO_PHUT." />
          <Nut onClick={chayDongBo} dangXuLy={dangXuLy}>
            Đồng bộ ngay
          </Nut>
          {dongBo && (
            <p className="m-0 mt-3 text-sm text-chu-phu">
              {dongBo.don_moi} đơn mới · {dongBo.cap_nhat} cập nhật · {dongBo.du_dieu_kien} đủ điều kiện · {dongBo.bi_tru} bị trừ · {dongBo.cho_xac_minh} chờ xác minh
              {dongBo.loi ? ` · ${dongBo.loi} lỗi` : ""}
              {!dongBo.quet_don_moi ? " — chưa quét được đơn mới theo [MGT:] trong ghi chú CRM (chờ bổ sung ở nền tảng)." : ""}
            </p>
          )}
        </The>
        <The>
          <TheTieuDe kicker="Ghi nhận tay" tieuDe="Ghi nhận đơn theo mã" moTa="Mỗi đơn chỉ ghi nhận một lần. Mã giới thiệu nhập tay luôn vào chờ xác minh (kể cả người phụ trách nhập); không gắn mã của chính mình." />
          <div className="grid gap-3 sm:grid-cols-2">
            <ONhap nhan="Mã đơn CRM" placeholder="DH-00012" value={maDon.ma_don} onChange={e => setMaDon({ ...maDon, ma_don: e.target.value })} />
            <ONhap nhan="Mã giới thiệu" placeholder="AL01-XXXXXX" value={maDon.ma_gioi_thieu} onChange={e => setMaDon({ ...maDon, ma_gioi_thieu: e.target.value })} />
          </div>
          <div className="mt-3 flex justify-end">
            <Nut kieu="vien" onClick={ghiNhan} dangXuLy={dangXuLy} disabled={maDon.ma_don.trim().length < 2}>
              Ghi nhận
            </Nut>
          </div>
        </The>
      </div>

      <The>
        <TheTieuDe
          kicker="Một đơn một người bán"
          tieuDe={loc ? "Đơn chờ xác minh" : "Tất cả đơn ghi nhận"}
          hanhDong={
            <OChon
              aria-label="Lọc"
              value={loc}
              onChange={e => setLoc(e.target.value as "CHO_XAC_MINH" | "")}
              luaChon={[
                { giaTri: "CHO_XAC_MINH", nhan: "Chờ xác minh" },
                { giaTri: "", nhan: "Tất cả" }
              ]}
            />
          }
        />
        {ds.dangTai && !ds.data ? (
          <DangTai />
        ) : ds.loi ? (
          <Loi chiTiet={ds.loi} thuLai={ds.taiLai} />
        ) : (
          <Bang<GhiNhanDonMl>
            dong={ds.data?.data ?? []}
            khoaDong={r => r.id}
            rong={<Trong tieuDe={loc ? "Không có đơn chờ xác minh" : "Chưa có đơn"} />}
            cot={[
              { khoa: "ma_don", tieuDe: "Đơn", hienThi: r => <strong>{r.ma_don}</strong> },
              { khoa: "ngay", tieuDe: "Ngày", hienThi: r => dinhDangNgay(r.created_at) },
              { khoa: "gt", tieuDe: "Giới thiệu", hienThi: r => (r.nguoi_gioi_thieu ? `${r.nguoi_gioi_thieu.ho_ten} · ${r.ma_gioi_thieu ?? ""}` : r.ma_gioi_thieu ?? "—") },
              { khoa: "chot", tieuDe: "Người chốt", hienThi: r => r.nguoi_chot?.ho_ten ?? "—" },
              { khoa: "ban", tieuDe: "Người bán", hienThi: r => (r.nguoi_ban ? `${r.nguoi_ban.ho_ten} (${NHAN_NGUON_DON_ML[r.nguon]})` : "—") },
              { khoa: "tong", tieuDe: "Giá trị", canPhai: true, hienThi: r => dinhDangTien(r.tong_tien) },
              { khoa: "hh", tieuDe: "Hoa hồng", canPhai: true, hienThi: r => (r.hoa_hong ? dinhDangTien(r.hoa_hong.so_tien) : "—") },
              { khoa: "tt", tieuDe: "Trạng thái", hienThi: r => <NhanGhiNhan tt={r.trang_thai} /> },
              {
                khoa: "xm",
                tieuDe: "",
                hienThi: r =>
                  r.trang_thai === "CHO_XAC_MINH" ? (
                    <Nut co="nho" onClick={() => setXm({ d: r, chon: r.nguoi_gioi_thieu ? "GIOI_THIEU" : "NGUOI_CHOT", ly_do: "" })}>
                      Xác minh
                    </Nut>
                  ) : r.nguoi_xac_minh ? (
                    <span className="text-xs text-chu-phu">bởi {r.nguoi_xac_minh.ho_ten}</span>
                  ) : null
              }
            ]}
          />
        )}
      </The>

      <HopThoai
        mo={!!xm}
        dong={() => setXm(null)}
        tieuDe={`Xác minh đơn ${xm?.d.ma_don ?? ""}`}
        moTa="Chọn đúng một người bán. Lựa chọn được gửi thành đề xuất: một người khác kiểm, Quản trị viên / Thiên Khuê duyệt rồi mới ghi nhận và tính hoa hồng. Bạn không được đề xuất cho đơn mình có liên quan (giới thiệu, chốt, nhập mã)."
        chanTrang={
          <Nut onClick={xacMinh} dangXuLy={dangXuLy} disabled={!xm || xm.ly_do.trim().length < 5}>
            Gửi đề xuất
          </Nut>
        }
      >
        {xm && (
          <div className="flex flex-col gap-4">
            {xm.d.ly_do && <p className="m-0 text-sm text-chu-phu">{xm.d.ly_do}</p>}
            <div className="flex flex-col gap-2">
              {xm.d.nguoi_gioi_thieu && (
                <OLuaChon daChon={xm.chon === "GIOI_THIEU"} onClick={() => setXm({ ...xm, chon: "GIOI_THIEU" })}>
                  Ghi nhận cho người giới thiệu: <strong>{xm.d.nguoi_gioi_thieu.ho_ten}</strong> (mã {xm.d.ma_gioi_thieu})
                </OLuaChon>
              )}
              {xm.d.nguoi_chot && (
                <OLuaChon daChon={xm.chon === "NGUOI_CHOT"} onClick={() => setXm({ ...xm, chon: "NGUOI_CHOT" })}>
                  Ghi nhận cho Sale chốt đơn: <strong>{xm.d.nguoi_chot.ho_ten}</strong>
                </OLuaChon>
              )}
              <OLuaChon daChon={xm.chon === "KHONG_AI"} onClick={() => setXm({ ...xm, chon: "KHONG_AI" })}>
                Không tính cho ai
              </OLuaChon>
            </div>
            <OVanBan nhan="Căn cứ xác minh" batBuoc value={xm.ly_do} onChange={e => setXm({ ...xm, ly_do: e.target.value })} placeholder="VD: khách vào từ link TikTok của KOC, Sale chỉ chốt địa chỉ" />
          </div>
        )}
      </HopThoai>
    </div>
  );
}

// ------------------------------------------------------------------ chien dich

const FORM_CD = { ten: "", mo_ta: "", ma_maus: "", vai: "KOL,KOC", ngan_sach: "", han: "", trang_thai: "DANG_CHAY" as TrangThaiChienDichMl };

function KhuChienDich() {
  const ds = useTaiMl(() => api.get<ChienDichQuanLy[]>("/mang-luoi/quan-ly/chien-dich"), []);
  const tg = useTaiMl(() => api.get<ThamGiaChienDichMl[]>("/mang-luoi/quan-ly/tham-gia"), []);
  const [mo, setMo] = useState(false);
  const [form, setForm] = useState(FORM_CD);
  const [dang, setDang] = useState<string | null>(null);
  const [tb, setTb] = useState<ThongBao>(null);

  async function chay(khoa: string, viec: () => Promise<unknown>, thanhCong: string) {
    setDang(khoa);
    setTb(null);
    try {
      await viec();
      setTb({ kieu: "thanh-cong", chu: thanhCong });
      await Promise.all([ds.taiLai(), tg.taiLai()]);
      return true;
    } catch (e) {
      setTb({ kieu: "canh-bao", chu: thongDiepLoi(e) });
      return false;
    } finally {
      setDang(null);
    }
  }

  async function tao() {
    const ok = await chay(
      "tao",
      () =>
        api.post("/mang-luoi/quan-ly/chien-dich", {
          ten: form.ten,
          mo_ta: form.mo_ta || undefined,
          ma_maus: form.ma_maus.split(/[\s,;]+/).filter(Boolean),
          vai_ap_dung: form.vai.split(",").filter(Boolean),
          ngan_sach: form.ngan_sach ? Number(form.ngan_sach) : undefined,
          han: form.han ? new Date(`${form.han}T23:59:59+07:00`).toISOString() : undefined,
          trang_thai: form.trang_thai
        }),
      "Đã tạo chiến dịch."
    );
    if (ok) {
      setMo(false);
      setForm(FORM_CD);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {tb && <ThongBaoNoiDong kieu={tb.kieu}>{tb.chu}</ThongBaoNoiDong>}
      <The>
        <TheTieuDe kicker="KOL · KOC" tieuDe="Chiến dịch" hanhDong={<Nut co="nho" onClick={() => setMo(true)}>Tạo chiến dịch</Nut>} />
        {ds.dangTai && !ds.data ? (
          <DangTai />
        ) : ds.loi ? (
          <Loi chiTiet={ds.loi} thuLai={ds.taiLai} />
        ) : (
          <Bang<ChienDichQuanLy>
            dong={ds.data ?? []}
            khoaDong={r => r.id}
            rong={<Trong tieuDe="Chưa có chiến dịch" />}
            cot={[
              { khoa: "ten", tieuDe: "Chiến dịch", hienThi: r => <strong>{r.ten}</strong> },
              { khoa: "sku", tieuDe: "SKU", hienThi: r => r.ma_maus.join(", ") },
              { khoa: "han", tieuDe: "Hạn", hienThi: r => dinhDangNgay(r.han) },
              { khoa: "tg", tieuDe: "Tham gia", canPhai: true, hienThi: r => `${r.so_tham_gia}${r.so_cho_duyet ? ` (+${r.so_cho_duyet} chờ)` : ""}` },
              { khoa: "nd", tieuDe: "Nội dung", canPhai: true, hienThi: r => r.so_noi_dung },
              { khoa: "xem", tieuDe: "Lượt xem", canPhai: true, hienThi: r => r.tong_luot_xem.toLocaleString("vi-VN") },
              { khoa: "tt", tieuDe: "Trạng thái", hienThi: r => <NhanChienDich tt={r.trang_thai} /> },
              {
                khoa: "doi",
                tieuDe: "",
                hienThi: r => (
                  <select
                    aria-label="Đổi trạng thái"
                    value={r.trang_thai}
                    disabled={dang === r.id}
                    onChange={e => chay(r.id, () => api.patch(`/mang-luoi/quan-ly/chien-dich/${r.id}`, { trang_thai: e.target.value }), "Đã đổi trạng thái chiến dịch.")}
                    className="h-9 rounded-lg border border-vien-dam bg-be-mat px-2 text-sm text-chu focus:border-chinh focus:outline-none focus:ring-2 focus:ring-chinh/20"
                  >
                    {Object.entries(NHAN_TRANG_THAI_CHIEN_DICH).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                )
              }
            ]}
          />
        )}
      </The>

      <The>
        <TheTieuDe kicker="Đăng ký" tieuDe="Người nhận chiến dịch" moTa="Duyệt đăng ký, nghiệm thu khi đã có nội dung được duyệt." />
        {tg.dangTai && !tg.data ? (
          <DangTai />
        ) : tg.loi ? (
          <Loi chiTiet={tg.loi} thuLai={tg.taiLai} />
        ) : (
          <Bang<ThamGiaChienDichMl>
            dong={tg.data ?? []}
            khoaDong={r => r.id}
            rong={<Trong tieuDe="Chưa có đăng ký" />}
            cot={[
              { khoa: "ng", tieuDe: "Người", hienThi: r => <strong>{r.ho_so.ho_ten}</strong> },
              { khoa: "cd", tieuDe: "Chiến dịch", hienThi: r => r.ten_chien_dich },
              { khoa: "nd", tieuDe: "Nội dung", canPhai: true, hienThi: r => r.so_noi_dung },
              { khoa: "ngay", tieuDe: "Đăng ký", hienThi: r => dinhDangNgay(r.created_at) },
              { khoa: "tt", tieuDe: "Trạng thái", hienThi: r => <NhanThamGia tt={r.trang_thai} /> },
              {
                khoa: "hd",
                tieuDe: "",
                hienThi: r =>
                  r.trang_thai === "CHO_DUYET" ? (
                    <span className="flex gap-2">
                      <Nut co="nho" dangXuLy={dang === r.id} onClick={() => chay(r.id, () => api.post(`/mang-luoi/quan-ly/tham-gia/${r.id}/duyet`, { dong_y: true }), "Đã duyệt đăng ký.")}>
                        Duyệt
                      </Nut>
                      <Nut kieu="trong" co="nho" onClick={() => chay(r.id, () => api.post(`/mang-luoi/quan-ly/tham-gia/${r.id}/duyet`, { dong_y: false }), "Đã từ chối.")}>
                        Từ chối
                      </Nut>
                    </span>
                  ) : r.trang_thai === "DA_DUYET" ? (
                    <Nut kieu="vien" co="nho" dangXuLy={dang === r.id} onClick={() => chay(r.id, () => api.post(`/mang-luoi/quan-ly/tham-gia/${r.id}/nghiem-thu`, {}), "Đã nghiệm thu.")}>
                      Nghiệm thu
                    </Nut>
                  ) : null
              }
            ]}
          />
        )}
      </The>

      <HopThoai
        mo={mo}
        dong={() => setMo(false)}
        tieuDe="Tạo chiến dịch"
        moTa="Người nhận phải có quyền bán MỌI mã sản phẩm trong chiến dịch."
        chanTrang={
          <Nut onClick={tao} dangXuLy={dang === "tao"} disabled={form.ten.trim().length < 3 || !form.ma_maus.trim()}>
            Tạo
          </Nut>
        }
      >
        <div className="flex flex-col gap-4">
          <ONhap nhan="Tên chiến dịch" batBuoc value={form.ten} onChange={e => setForm({ ...form, ten: e.target.value })} />
          <ONhap nhan="Mã sản phẩm" batBuoc placeholder="AL01, AK01" goiY="Cách nhau bởi dấu phẩy" value={form.ma_maus} onChange={e => setForm({ ...form, ma_maus: e.target.value })} />
          <OChon
            nhan="Vai áp dụng"
            value={form.vai}
            onChange={e => setForm({ ...form, vai: e.target.value })}
            luaChon={[
              { giaTri: "KOL,KOC", nhan: "KOL + KOC" },
              { giaTri: "KOC", nhan: "Chỉ KOC" },
              { giaTri: "KOL", nhan: "Chỉ KOL" },
              { giaTri: "KOL,KOC,CTV", nhan: "KOL + KOC + CTV" }
            ]}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <ONhap nhan="Ngân sách (đ)" type="number" min={0} value={form.ngan_sach} onChange={e => setForm({ ...form, ngan_sach: e.target.value })} />
            <ONhap nhan="Hạn" type="date" value={form.han} onChange={e => setForm({ ...form, han: e.target.value })} />
          </div>
          <OChon
            nhan="Trạng thái"
            value={form.trang_thai}
            onChange={e => setForm({ ...form, trang_thai: e.target.value as TrangThaiChienDichMl })}
            luaChon={Object.entries(NHAN_TRANG_THAI_CHIEN_DICH).map(([k, v]) => ({ giaTri: k, nhan: v }))}
          />
          <OVanBan nhan="Brief" value={form.mo_ta} onChange={e => setForm({ ...form, mo_ta: e.target.value })} />
        </div>
      </HopThoai>
    </div>
  );
}

// ------------------------------------------------------------------ noi dung

function KhuNoiDung() {
  const [loc, setLoc] = useState("CHO_DUYET");
  const ds = useTaiMl(() => api.get<NoiDungKocMl[]>("/mang-luoi/quan-ly/noi-dung", { trang_thai: loc || undefined }), [loc]);
  const [duyet, setDuyet] = useState<{ nd: NoiDungKocMl; ket_qua: "DA_DUYET" | "CAN_SUA" | "TU_CHOI"; nhan_xet: string } | null>(null);
  const [soLieu, setSoLieu] = useState<{ nd: NoiDungKocMl; xem: string; tt: string } | null>(null);
  const [dang, setDang] = useState(false);
  const [tb, setTb] = useState<ThongBao>(null);

  async function guiDuyet() {
    if (!duyet) return;
    setDang(true);
    try {
      await api.post(`/mang-luoi/quan-ly/noi-dung/${duyet.nd.id}/duyet`, { ket_qua: duyet.ket_qua, nhan_xet: duyet.nhan_xet || undefined });
      setTb({ kieu: "thanh-cong", chu: "Đã lưu kết quả duyệt." });
      await ds.taiLai();
    } catch (e) {
      setTb({ kieu: "canh-bao", chu: thongDiepLoi(e) });
    } finally {
      setDuyet(null);
      setDang(false);
    }
  }

  async function guiSoLieu() {
    if (!soLieu) return;
    setDang(true);
    try {
      await api.patch(`/mang-luoi/noi-dung/${soLieu.nd.id}/so-lieu`, { luot_xem: Number(soLieu.xem) || 0, luot_tuong_tac: Number(soLieu.tt) || 0 });
      setTb({ kieu: "thanh-cong", chu: "Đã cập nhật số liệu." });
      await ds.taiLai();
    } catch (e) {
      setTb({ kieu: "canh-bao", chu: thongDiepLoi(e) });
    } finally {
      setSoLieu(null);
      setDang(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {tb && <ThongBaoNoiDong kieu={tb.kieu}>{tb.chu}</ThongBaoNoiDong>}
      <The>
        <TheTieuDe
          kicker="KOL · KOC"
          tieuDe="Kịch bản & video"
          hanhDong={
            <OChon
              aria-label="Lọc trạng thái"
              value={loc}
              onChange={e => setLoc(e.target.value)}
              luaChon={[
                { giaTri: "CHO_DUYET", nhan: "Chờ duyệt" },
                { giaTri: "DA_DUYET", nhan: "Đã duyệt" },
                { giaTri: "DA_DANG", nhan: "Đã đăng" },
                { giaTri: "", nhan: "Tất cả" }
              ]}
            />
          }
        />
        {ds.dangTai && !ds.data ? (
          <DangTai />
        ) : ds.loi ? (
          <Loi chiTiet={ds.loi} thuLai={ds.taiLai} />
        ) : ds.data?.length ? (
          <ul className="m-0 flex list-none flex-col p-0">
            {ds.data.map(nd => (
              <li key={nd.id} className="flex flex-col gap-2 border-t border-vien py-4 first:border-0 first:pt-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <strong className="text-h4">
                    {nd.tieu_de} <span className="font-normal text-chu-phu">· {nd.ho_so.ho_ten}</span>
                  </strong>
                  <NhanNoiDung tt={nd.trang_thai} />
                </div>
                <span className="text-sm text-chu-phu">
                  {nd.loai === "VIDEO" ? "Video" : "Kịch bản"}
                  {nd.ma_mau ? ` · ${nd.ma_mau}` : ""}
                  {nd.ten_chien_dich ? ` · ${nd.ten_chien_dich}` : ""} · {dinhDangNgayGio(nd.created_at)} · {nd.luot_xem.toLocaleString("vi-VN")} xem / {nd.luot_tuong_tac.toLocaleString("vi-VN")} tương tác
                </span>
                {nd.link_video && (
                  <a href={nd.link_video} target="_blank" rel="noopener noreferrer" className="break-all text-sm font-medium text-chinh hover:text-chinh-dam hover:underline">
                    {nd.link_video}
                  </a>
                )}
                {nd.kich_ban && <p className="m-0 max-h-[160px] overflow-y-auto whitespace-pre-line rounded-lg bg-be-mat-phu px-3 py-2 text-sm">{nd.kich_ban}</p>}
                <div className="flex flex-wrap gap-2">
                  {nd.trang_thai === "CHO_DUYET" && (
                    <Nut co="nho" onClick={() => setDuyet({ nd, ket_qua: "DA_DUYET", nhan_xet: "" })}>
                      Duyệt
                    </Nut>
                  )}
                  {(nd.trang_thai === "DA_DUYET" || nd.trang_thai === "DA_DANG") && (
                    <Nut kieu="vien" co="nho" onClick={() => setSoLieu({ nd, xem: String(nd.luot_xem), tt: String(nd.luot_tuong_tac) })}>
                      Nhập số liệu
                    </Nut>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <Trong tieuDe="Không có nội dung" />
        )}
      </The>

      <HopThoai
        mo={!!duyet}
        dong={() => setDuyet(null)}
        tieuDe="Duyệt nội dung"
        moTa={duyet?.nd.tieu_de}
        rong="nho"
        chanTrang={
          <Nut onClick={guiDuyet} dangXuLy={dang} disabled={!duyet || (duyet.ket_qua !== "DA_DUYET" && !duyet.nhan_xet.trim())}>
            Lưu
          </Nut>
        }
      >
        {duyet && (
          <div className="flex flex-col gap-4">
            <OChon
              nhan="Kết quả"
              value={duyet.ket_qua}
              onChange={e => setDuyet({ ...duyet, ket_qua: e.target.value as "DA_DUYET" | "CAN_SUA" | "TU_CHOI" })}
              luaChon={[
                { giaTri: "DA_DUYET", nhan: "Duyệt" },
                { giaTri: "CAN_SUA", nhan: "Cần sửa" },
                { giaTri: "TU_CHOI", nhan: "Từ chối" }
              ]}
            />
            <OVanBan nhan="Nhận xét" value={duyet.nhan_xet} onChange={e => setDuyet({ ...duyet, nhan_xet: e.target.value })} />
          </div>
        )}
      </HopThoai>

      <HopThoai
        mo={!!soLieu}
        dong={() => setSoLieu(null)}
        tieuDe="Nhập số liệu"
        moTa={soLieu?.nd.tieu_de}
        rong="nho"
        chanTrang={
          <Nut onClick={guiSoLieu} dangXuLy={dang}>
            Lưu
          </Nut>
        }
      >
        {soLieu && (
          <div className="flex flex-col gap-4">
            <ONhap nhan="Lượt xem" type="number" min={0} value={soLieu.xem} onChange={e => setSoLieu({ ...soLieu, xem: e.target.value })} />
            <ONhap nhan="Lượt tương tác" type="number" min={0} value={soLieu.tt} onChange={e => setSoLieu({ ...soLieu, tt: e.target.value })} />
          </div>
        )}
      </HopThoai>
    </div>
  );
}

// ------------------------------------------------------------------ dieu chinh

interface DeXuatChoApDung {
  id: string;
  du_lieu: { ho_so_id?: string; ho_ten?: string; so_tien?: number; ky?: string; ly_do?: string };
  ly_do: string | null;
  duyet_luc: string | null;
}

function KhuDieuChinh() {
  const cho = useTaiMl(() => api.get<DeXuatChoApDung[]>("/mang-luoi/quan-ly/dieu-chinh/cho-ap-dung"), []);
  const [form, setForm] = useState({ ho_so_id: "", so_tien: "", ly_do: "", ky: "" });
  const [dang, setDang] = useState<string | null>(null);
  const [tb, setTb] = useState<ThongBao>(null);

  async function deXuat() {
    setDang("dx");
    setTb(null);
    try {
      await api.post("/mang-luoi/quan-ly/dieu-chinh", {
        ho_so_id: form.ho_so_id.trim(),
        so_tien: Math.round(Number(form.so_tien)),
        ly_do: form.ly_do,
        ky: form.ky || undefined
      });
      setTb({ kieu: "thanh-cong", chu: "Đã tạo đề xuất — cần người kiểm và người duyệt khác bạn ở Bàn phê duyệt." });
      setForm({ ho_so_id: "", so_tien: "", ly_do: "", ky: "" });
    } catch (e) {
      setTb({ kieu: "canh-bao", chu: thongDiepLoi(e) });
    } finally {
      setDang(null);
    }
  }

  async function apDung(id: string) {
    setDang(id);
    setTb(null);
    try {
      await api.post(`/mang-luoi/quan-ly/dieu-chinh/${id}/ap-dung`);
      setTb({ kieu: "thanh-cong", chu: "Đã ghi khoản điều chỉnh vào ví." });
      await cho.taiLai();
    } catch (e) {
      setTb({ kieu: "canh-bao", chu: thongDiepLoi(e) });
    } finally {
      setDang(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {tb && <ThongBaoNoiDong kieu={tb.kieu}>{tb.chu}</ThongBaoNoiDong>}
      <The>
        <TheTieuDe kicker="Maker-checker" tieuDe="Đề xuất điều chỉnh hoa hồng" moTa="Số âm = trừ, số dương = cộng. Không tự đề xuất cho chính mình." />
        <div className="grid gap-4 md:grid-cols-2">
          <ONhap nhan="Mã hồ sơ (UUID)" batBuoc value={form.ho_so_id} onChange={e => setForm({ ...form, ho_so_id: e.target.value })} goiY="Lấy ở trang Quản trị → Hồ sơ" />
          <ONhap nhan="Số tiền (đ)" batBuoc type="number" value={form.so_tien} onChange={e => setForm({ ...form, so_tien: e.target.value })} />
          <ONhap nhan="Kỳ (YYYY-MM)" placeholder="2026-10" value={form.ky} onChange={e => setForm({ ...form, ky: e.target.value })} />
          <OVanBan nhan="Lý do" batBuoc value={form.ly_do} onChange={e => setForm({ ...form, ly_do: e.target.value })} lopKhung="md:col-span-2" />
        </div>
        <div className="mt-4 flex justify-end">
          <Nut onClick={deXuat} dangXuLy={dang === "dx"} disabled={!form.ho_so_id.trim() || !Number(form.so_tien) || form.ly_do.trim().length < 5}>
            Gửi đề xuất
          </Nut>
        </div>
      </The>

      <The>
        <TheTieuDe kicker="Đã duyệt" tieuDe="Chờ áp dụng vào ví" />
        {cho.dangTai && !cho.data ? (
          <DangTai />
        ) : cho.loi ? (
          <Loi chiTiet={cho.loi} thuLai={cho.taiLai} />
        ) : cho.data?.length ? (
          <ul className="m-0 flex list-none flex-col p-0">
            {cho.data.map(d => (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-vien py-3 first:border-0 first:pt-0">
                <span className="flex min-w-0 flex-col">
                  <strong className="text-h4">
                    {d.du_lieu.ho_ten ?? d.du_lieu.ho_so_id} · {(d.du_lieu.so_tien ?? 0) > 0 ? "+" : ""}
                    {dinhDangTien(d.du_lieu.so_tien ?? 0)}
                  </strong>
                  <span className="text-sm text-chu-phu">
                    Kỳ {d.du_lieu.ky ?? "—"} · duyệt {dinhDangNgay(d.duyet_luc)} · {d.du_lieu.ly_do ?? d.ly_do ?? ""}
                  </span>
                </span>
                <Nut co="nho" dangXuLy={dang === d.id} onClick={() => apDung(d.id)}>
                  Áp dụng
                </Nut>
              </li>
            ))}
          </ul>
        ) : (
          <Trong tieuDe="Không có đề xuất chờ áp dụng" />
        )}
      </The>
    </div>
  );
}
