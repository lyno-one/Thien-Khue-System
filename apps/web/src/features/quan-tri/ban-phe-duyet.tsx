"use client";

import type { DeXuatChiTiet, DeXuatDuyet, DeXuatQuery, HangChoPheDuyet, NguoiTomTatQt, PhanTrangMeta } from "@thien-khue/contracts";
import { NHAN_LOAI_DE_XUAT, NHAN_NGUON_DON_QT, nhanSoBuocDeXuat, soBuocDeXuat } from "@thien-khue/contracts";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { DangTai, HopThoai, Loi, lopKicker, lopLienKet, Nhan, Nut, OVanBan, The, ThongBaoNoiDong, TieuDeTrang, Trong } from "@/components/ui";
import { api, thongDiepLoi } from "@/lib/api";
import { cn } from "@/lib/cn";
import { dinhDangNgayGio, dinhDangTien } from "@/lib/dinh-dang";
import { BoLoc, NhanDeXuat, PhanTrang, useTaiDuLieu } from "./dung-chung";
import { FormDeXuat, type MacDinhDeXuat } from "./form-de-xuat";
import { DongNhatKy } from "./nhat-ky";

/*
 * Ban phe duyet cho CEO / Thien Khue (README muc 4): duyet qua tang doi tac, giai quyet don trung nguon,
 * duyet chuyen vai / cap quyen ban, doi chinh sach. So buoc theo loai (dx.so_buoc):
 *   TIEN (chi tra, dieu chinh hoa hong, xac minh ai nhan hoa hong) + du lieu khach: de xuat -> kiem -> duyet, 3 nguoi khac nhau.
 *   Con lai: de xuat -> duyet, nguoi duyet khac nguoi de xuat. Vai Sale / CSKH / Quan ly / Admin lay tu CRM, khong de xuat o day.
 * Nut chi hien khi server bao duoc phep (co_the_kiem / co_the_duyet / co_the_huy) — server van kiem lai.
 */

type Tab = "CAN_TOI" | "CHO_KIEM" | "CHO_DUYET" | "HANG_CHO" | "CUA_TOI" | "DA_DUYET" | "TU_CHOI";
const TAB: { giaTri: Tab; nhan: string }[] = [
  { giaTri: "CAN_TOI", nhan: "Việc của tôi" },
  { giaTri: "CHO_KIEM", nhan: "Chờ kiểm (tiền)" },
  { giaTri: "CHO_DUYET", nhan: "Chờ duyệt" },
  { giaTri: "HANG_CHO", nhan: "Hàng chờ lập đề xuất" },
  { giaTri: "CUA_TOI", nhan: "Tôi đề xuất" },
  { giaTri: "DA_DUYET", nhan: "Đã duyệt" },
  { giaTri: "TU_CHOI", nhan: "Từ chối" }
];

type HanhDong = { loai: "kiem" | "duyet"; dongY: boolean; dx: DeXuatDuyet } | { loai: "huy"; dx: DeXuatDuyet };

export function BanPheDuyet() {
  const tham = useSearchParams();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("CAN_TOI");
  const [trang, setTrang] = useState(1);
  const [moForm, setMoForm] = useState(false);
  const [thongBao, setThongBao] = useState<string | null>(null);
  const [hanhDong, setHanhDong] = useState<HanhDong | null>(null);
  const idXem = tham.get("id");

  // ?lap=CAP_QUYEN_SKU&ho_so=<id>&ten=<ho ten> — mo form tu trang ho so
  const macDinh = useMemo<MacDinhDeXuat | undefined>(() => {
    const lap = tham.get("lap");
    if (lap !== "CAP_QUYEN_SKU") return undefined;
    const id = tham.get("ho_so");
    return { loai: lap, hoSo: id ? { id, ho_ten: tham.get("ten") ?? "Hồ sơ đã chọn" } : undefined };
  }, [tham]);
  useEffect(() => {
    if (macDinh) setMoForm(true);
  }, [macDinh]);

  const query = useMemo<DeXuatQuery>(() => {
    if (tab === "CAN_TOI" || tab === "CUA_TOI") return { pham_vi: tab, trang, so_dong: 20 };
    if (tab === "HANG_CHO") return {};
    return { trang_thai: tab, trang, so_dong: 20 };
  }, [tab, trang]);

  const ds = useTaiDuLieu(
    () => (tab === "HANG_CHO" ? Promise.resolve(null) : api.layCoMeta<DeXuatDuyet[], PhanTrangMeta>("/quan-tri/de-xuat", { ...query })),
    [query, tab]
  );
  const hangCho = useTaiDuLieu(() => (tab === "HANG_CHO" ? api.get<HangChoPheDuyet>("/quan-tri/phe-duyet/hang-cho") : Promise.resolve(null)), [tab]);

  const xongThaoTac = (tb: string) => {
    setThongBao(tb);
    void ds.taiLai();
    void hangCho.taiLai();
  };

  return (
    <div className="flex flex-col gap-6">
      <TieuDeTrang
        kicker="Quản trị"
        tieuDe="Bàn phê duyệt"
        moTa="Đề xuất về tiền (chi trả, điều chỉnh hoa hồng, xác minh ai nhận hoa hồng) đi 3 bước: đề xuất → kiểm → duyệt, ba người khác nhau. Các loại khác 2 bước: đề xuất → duyệt, người duyệt khác người đề xuất. Vai Sale, CSKH, Quản lý, Admin lấy từ CRM. Mọi bước được ghi nhật ký; quyết định áp dụng ngay khi duyệt."
        hanhDong={
          <Nut onClick={() => setMoForm(true)}>
            + Lập đề xuất
          </Nut>
        }
      />

      {thongBao && (
        <ThongBaoNoiDong kieu="thanh-cong">
          <div className="flex items-start justify-between gap-3">
            <span>{thongBao}</span>
            <button type="button" className="min-h-[32px] shrink-0 text-sm font-medium underline underline-offset-2" onClick={() => setThongBao(null)}>
              Đóng
            </button>
          </div>
        </ThongBaoNoiDong>
      )}

      <BoLoc
        nhanAria="Nhóm đề xuất"
        luaChon={TAB}
        giaTri={tab}
        doi={v => {
          setTab(v);
          setTrang(1);
        }}
      />

      {tab === "HANG_CHO" ? (
        hangCho.loi ? (
          <Loi chiTiet={hangCho.loi} thuLai={() => void hangCho.taiLai()} />
        ) : !hangCho.duLieu ? (
          <DangTai />
        ) : (
          <HangCho duLieu={hangCho.duLieu} xong={xongThaoTac} />
        )
      ) : ds.loi ? (
        <Loi chiTiet={ds.loi} thuLai={() => void ds.taiLai()} />
      ) : !ds.duLieu && ds.dangTai ? (
        <DangTai />
      ) : !ds.duLieu?.data.length ? (
        <Trong tieuDe={tab === "CAN_TOI" ? "Không có việc chờ bạn" : "Chưa có đề xuất"} moTa={tab === "CAN_TOI" ? "Đề xuất cần bạn duyệt (hoặc kiểm, với đề xuất về tiền) sẽ hiện ở đây." : undefined} />
      ) : (
        <>
          <div className="flex flex-col gap-4">
            {ds.duLieu.data.map(dx => (
              <TheDeXuat key={dx.id} dx={dx} chon={setHanhDong} xem={() => router.replace(`/quan-tri/phe-duyet?id=${dx.id}`, { scroll: false })} />
            ))}
          </div>
          <PhanTrang meta={ds.duLieu.meta} doiTrang={setTrang} />
        </>
      )}

      <FormDeXuat
        mo={moForm}
        macDinh={macDinh}
        dong={() => setMoForm(false)}
        xong={dx => {
          setMoForm(false);
          setTab("CUA_TOI");
          xongThaoTac(`Đã gửi đề xuất "${NHAN_LOAI_DE_XUAT[dx.loai]}". ${soBuocDeXuat(dx.loai) === 3 ? "Chờ người khác kiểm, rồi người thứ ba duyệt." : "Chờ người có thẩm quyền duyệt."}`);
        }}
      />

      <HopThoaiQuyetDinh hanhDong={hanhDong} dong={() => setHanhDong(null)} xong={tb => { setHanhDong(null); xongThaoTac(tb); }} />

      <HopThoaiChiTiet id={idXem} dong={() => router.replace("/quan-tri/phe-duyet", { scroll: false })} chon={setHanhDong} />
    </div>
  );
}

// ------------------------------------------------------------------ the de xuat

function TheDeXuat({ dx, chon, xem }: { dx: DeXuatDuyet; chon: (h: HanhDong) => void; xem: () => void }) {
  return (
    <The className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className={lopKicker}>{NHAN_LOAI_DE_XUAT[dx.loai]}</span>
            <NhanSoBuoc dx={dx} />
          </span>
          <strong className="break-words text-h3 text-chu">{dx.mo_ta_doi_tuong ?? dx.doi_tuong}</strong>
          {dx.ly_do && <p className="m-0 text-sm text-chu-phu">Lý do: {dx.ly_do}</p>}
        </div>
        <NhanDeXuat trangThai={dx.trang_thai} />
      </div>

      <ChuoiBuoc dx={dx} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={xem} className={cn(lopLienKet, "min-h-[36px] text-sm")}>
          Chi tiết & nhật ký
        </button>
        <div className="flex flex-wrap gap-2">
          {dx.co_the_huy && (
            <Nut kieu="trong" co="nho" onClick={() => chon({ loai: "huy", dx })}>
              Rút đề xuất
            </Nut>
          )}
          {dx.co_the_kiem && (
            <>
              <Nut kieu="vien" co="nho" onClick={() => chon({ loai: "kiem", dongY: false, dx })}>
                Kiểm: không đạt
              </Nut>
              <Nut co="nho" onClick={() => chon({ loai: "kiem", dongY: true, dx })}>
                Kiểm: đạt
              </Nut>
            </>
          )}
          {dx.co_the_duyet && (
            <>
              <Nut kieu="nguy-hiem" co="nho" onClick={() => chon({ loai: "duyet", dongY: false, dx })}>
                Từ chối
              </Nut>
              <Nut co="nho" onClick={() => chon({ loai: "duyet", dongY: true, dx })}>
                Duyệt & áp dụng
              </Nut>
            </>
          )}
        </div>
      </div>
      {dx.ly_do_khong_duyet && !dx.co_the_duyet && <p className="m-0 text-xs text-chu-mo">{dx.ly_do_khong_duyet}</p>}
    </The>
  );
}

/** "2 bước" / "3 bước (tiền)" — so buoc theo loai */
function NhanSoBuoc({ dx }: { dx: Pick<DeXuatDuyet, "loai" | "so_buoc"> }) {
  const ba = (dx.so_buoc ?? soBuocDeXuat(dx.loai)) === 3;
  return (
    <Nhan tong={ba ? "canh-bao" : "trung-tinh"}>{nhanSoBuocDeXuat(dx.loai)}</Nhan>
  );
}

/** De xuat -> (Kiem ->) Duyet: ai, luc nao, y kien. Loai 2 buoc khong co o Kiem. */
function ChuoiBuoc({ dx }: { dx: DeXuatDuyet }) {
  const baBuoc = (dx.so_buoc ?? soBuocDeXuat(dx.loai)) === 3;
  const buoc: { nhan: string; nguoi: NguoiTomTatQt | null; luc: string | null; yKien: string | null; xong: boolean }[] = [
    { nhan: "Đề xuất", nguoi: dx.nguoi_de_xuat, luc: dx.created_at, yKien: null, xong: true },
    ...(baBuoc || dx.nguoi_kiem ? [{ nhan: "Kiểm", nguoi: dx.nguoi_kiem, luc: dx.kiem_luc, yKien: dx.y_kien_kiem, xong: !!dx.nguoi_kiem }] : []),
    { nhan: "Duyệt", nguoi: dx.nguoi_duyet, luc: dx.duyet_luc, yKien: dx.y_kien_duyet, xong: !!dx.nguoi_duyet }
  ];
  return (
    <ol className={cn("m-0 grid list-none gap-3 p-0", buoc.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2")}>
      {buoc.map((b, i) => (
        <li key={b.nhan} className={cn("flex flex-col gap-1 rounded-lg border px-4 py-3 text-xs", b.xong ? "border-vien bg-be-mat-phu" : "border-dashed border-vien-dam bg-be-mat")}>
          <span className="font-semibold uppercase tracking-[0.04em] text-chu-mo">
            {i + 1}. {b.nhan}
          </span>
          <span className={cn("text-sm font-medium", b.nguoi ? "text-chu" : "text-chu-mo")}>{b.nguoi?.ho_ten ?? "Chưa có"}</span>
          {b.luc && b.xong && <span className="so text-chu-mo">{dinhDangNgayGio(b.luc)}</span>}
          {b.yKien && <span className="text-chu-phu">“{b.yKien}”</span>}
        </li>
      ))}
    </ol>
  );
}

// ------------------------------------------------------------------ hop thoai quyet dinh

function HopThoaiQuyetDinh({ hanhDong, dong, xong }: { hanhDong: HanhDong | null; dong: () => void; xong: (tb: string) => void }) {
  const [yKien, setYKien] = useState("");
  const [dangGui, setDangGui] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);

  useEffect(() => {
    setYKien("");
    setLoi(null);
  }, [hanhDong]);

  if (!hanhDong) return <HopThoai mo={false} dong={dong} tieuDe="" />;
  const { dx } = hanhDong;
  const tuChoi = hanhDong.loai !== "huy" && !hanhDong.dongY;
  const tieuDe =
    hanhDong.loai === "huy" ? "Rút đề xuất" : hanhDong.loai === "kiem" ? (hanhDong.dongY ? "Xác nhận kiểm đạt" : "Kiểm: không đạt") : hanhDong.dongY ? "Duyệt và áp dụng" : "Từ chối đề xuất";

  async function gui() {
    if (tuChoi && !yKien.trim()) {
      setLoi("Từ chối cần ghi ý kiến");
      return;
    }
    setDangGui(true);
    setLoi(null);
    try {
      if (!hanhDong) return;
      if (hanhDong.loai === "huy") {
        await api.post(`/quan-tri/de-xuat/${dx.id}/huy`, { ly_do: yKien.trim() || undefined });
        xong("Đã rút đề xuất.");
      } else {
        await api.post(`/quan-tri/de-xuat/${dx.id}/${hanhDong.loai}`, { dong_y: hanhDong.dongY, y_kien: yKien.trim() || undefined });
        xong(hanhDong.loai === "kiem" ? (hanhDong.dongY ? "Đã kiểm đạt — chuyển sang người duyệt." : "Đã từ chối ở bước kiểm.") : hanhDong.dongY ? "Đã duyệt và áp dụng quyết định." : "Đã từ chối đề xuất.");
      }
    } catch (e) {
      setLoi(thongDiepLoi(e));
    } finally {
      setDangGui(false);
    }
  }

  return (
    <HopThoai
      mo
      dong={dong}
      tieuDe={tieuDe}
      moTa={`${NHAN_LOAI_DE_XUAT[dx.loai]} · ${dx.mo_ta_doi_tuong ?? dx.doi_tuong}`}
      chanTrang={
        <>
          <Nut kieu="trong" onClick={dong}>
            Đóng
          </Nut>
          <Nut kieu={tuChoi ? "nguy-hiem" : "chinh"} dangXuLy={dangGui} onClick={() => void gui()}>
            {tieuDe}
          </Nut>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="m-0 flex flex-wrap items-center gap-2 text-sm text-chu-phu">
          <NhanSoBuoc dx={dx} />
          {(dx.so_buoc ?? soBuocDeXuat(dx.loai)) === 3
            ? "Đề xuất về tiền: người đề xuất, người kiểm và người duyệt là ba người khác nhau."
            : "Đề xuất 2 bước: người duyệt khác người đề xuất, không có bước kiểm."}
        </p>
        <DuLieuDeXuat dx={dx} />
        {hanhDong.loai === "duyet" && hanhDong.dongY && (
          <ThongBaoNoiDong kieu="canh-bao">Quyết định được áp dụng ngay trong cùng giao dịch (đổi vai, cấp quyền, duyệt quà, ghi nhận đơn, đổi chính sách) và ghi nhật ký.</ThongBaoNoiDong>
        )}
        <OVanBan nhan={hanhDong.loai === "huy" ? "Lý do rút" : "Ý kiến"} batBuoc={tuChoi} rows={3} value={yKien} onChange={e => setYKien(e.target.value)} />
        {loi && <ThongBaoNoiDong kieu="canh-bao">{loi}</ThongBaoNoiDong>}
      </div>
    </HopThoai>
  );
}

/** Hien du_lieu de xuat dang nhan / gia tri (bo cac khoa ky thuat) */
const NHAN_TRUONG: Record<string, string> = {
  ho_ten: "Hồ sơ",
  vai: "Vai",
  vai_moi: "Vai mới",
  tu_vai: "Kết thúc vai cũ",
  trang_thai_cu: "Trạng thái cũ",
  trang_thai_moi: "Trạng thái mới",
  trang_thai_vai_moi: "Trạng thái vai mới",
  ma_mau: "Mã SKU",
  ten_mau: "Sản phẩm",
  ten: "Tên",
  doi_tac: "Đối tác",
  gia_tri: "Giá trị",
  so_luong: "Số lượng",
  ghi_chu: "Ghi chú",
  ma: "Mã",
  ma_don: "Mã đơn",
  tong_tien: "Tổng tiền",
  ket_qua: "Kết quả",
  nguon: "Nguồn ghi nhận",
  nguon_cu: "Nguồn cũ",
  ma_gioi_thieu: "Mã giới thiệu",
  chinh_sach: "Chính sách",
  ty_le: "Tỷ lệ mới (%)",
  ty_le_truoc: "Tỷ lệ hiện hành (%)",
  hang: "Hạng",
  nguong_tich_luy: "Ngưỡng mới",
  nguong_truoc: "Ngưỡng hiện hành",
  giam_gia_phan_tram: "Giảm giá mới (%)",
  giam_gia_truoc: "Giảm giá hiện hành (%)",
  noi_dung: "Nội dung"
};
const TRUONG_TIEN = new Set(["gia_tri", "tong_tien", "nguong_tich_luy", "nguong_truoc"]);

export function DuLieuDeXuat({ dx }: { dx: Pick<DeXuatDuyet, "du_lieu"> }) {
  const dong = Object.entries(dx.du_lieu ?? {}).filter(([k, v]) => NHAN_TRUONG[k] && v !== null && v !== undefined && v !== "");
  const bangChung = (dx.du_lieu as { bang_chung?: Record<string, unknown> | null }).bang_chung;
  if (!dong.length && !bangChung) return null;
  return (
    <dl className="m-0 grid gap-x-6 gap-y-3 rounded-lg bg-be-mat-phu p-4 text-sm sm:grid-cols-2">
      {dong.map(([k, v]) => (
        <div key={k} className="flex flex-col">
          <dt className="text-xs font-medium text-chu-phu">{NHAN_TRUONG[k]}</dt>
          <dd className="m-0 break-words font-medium text-chu">{TRUONG_TIEN.has(k) && typeof v === "number" ? dinhDangTien(v) : String(v)}</dd>
        </div>
      ))}
      {bangChung && (
        <div className="flex flex-col sm:col-span-2">
          <dt className="text-xs font-medium text-chu-phu">Bằng chứng học đạt</dt>
          <dd className="m-0 break-words font-medium text-chu">
            {String(bangChung.khoa_hoc ?? "")} · điểm {String(bangChung.diem ?? "—")}% · tài liệu v{String(bangChung.phien_ban_tai_lieu ?? "?")}
            {bangChung.bai_thuc_hanh_id ? " · thực hành đã duyệt" : ""}
          </dd>
        </div>
      )}
    </dl>
  );
}

// ------------------------------------------------------------------ chi tiet + nhat ky

function HopThoaiChiTiet({ id, dong, chon }: { id: string | null; dong: () => void; chon: (h: HanhDong) => void }) {
  const ct = useTaiDuLieu(() => (id ? api.get<DeXuatChiTiet>(`/quan-tri/de-xuat/${id}`) : Promise.resolve(null)), [id]);
  return (
    <HopThoai mo={!!id} dong={dong} rong="lon" tieuDe={ct.duLieu ? NHAN_LOAI_DE_XUAT[ct.duLieu.loai] : "Chi tiết đề xuất"} moTa={ct.duLieu?.mo_ta_doi_tuong ?? undefined}>
      {ct.loi ? (
        <Loi chiTiet={ct.loi} />
      ) : !ct.duLieu ? (
        <DangTai />
      ) : (
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-3">
            <NhanDeXuat trangThai={ct.duLieu.trang_thai} />
            <NhanSoBuoc dx={ct.duLieu} />
            {ct.duLieu.ly_do && <span className="text-sm text-chu-phu">Lý do: {ct.duLieu.ly_do}</span>}
          </div>
          <DuLieuDeXuat dx={ct.duLieu} />
          <ChuoiBuoc dx={ct.duLieu} />
          {(ct.duLieu.co_the_kiem || ct.duLieu.co_the_duyet) && (
            <div className="flex flex-wrap justify-end gap-2">
              {ct.duLieu.co_the_kiem && (
                <Nut co="nho" onClick={() => { const d = ct.duLieu as DeXuatChiTiet; dong(); chon({ loai: "kiem", dongY: true, dx: d }); }}>
                  Kiểm đề xuất này
                </Nut>
              )}
              {ct.duLieu.co_the_duyet && (
                <Nut co="nho" onClick={() => { const d = ct.duLieu as DeXuatChiTiet; dong(); chon({ loai: "duyet", dongY: true, dx: d }); }}>
                  Duyệt đề xuất này
                </Nut>
              )}
            </div>
          )}
          <section className="flex flex-col gap-2">
            <h3 className="m-0 text-h3 text-chu">Nhật ký</h3>
            {ct.duLieu.nhat_ky.length ? (
              <ul className="m-0 flex list-none flex-col p-0">
                {ct.duLieu.nhat_ky.map(n => (
                  <DongNhatKy key={n.id} n={n} />
                ))}
              </ul>
            ) : (
              <p className="m-0 text-sm text-chu-mo">Chưa có nhật ký.</p>
            )}
          </section>
        </div>
      )}
    </HopThoai>
  );
}

// ------------------------------------------------------------------ hang cho (chua co de xuat)

function HangCho({ duLieu, xong }: { duLieu: HangChoPheDuyet; xong: (tb: string) => void }) {
  const [dangGui, setDangGui] = useState<string | null>(null);
  const [loi, setLoi] = useState<string | null>(null);
  const [chonBan, setChonBan] = useState<Record<string, string>>({});

  async function lap(khoa: string, body: object, tb: string) {
    setDangGui(khoa);
    setLoi(null);
    try {
      await api.post("/quan-tri/de-xuat", body);
      xong(tb);
    } catch (e) {
      setLoi(thongDiepLoi(e));
    } finally {
      setDangGui(null);
    }
  }

  const trong = !duLieu.qua_tang.length && !duLieu.voucher.length && !duLieu.don_cho_xac_minh.length;
  if (trong) return <Trong tieuDe="Không còn việc chờ lập đề xuất" moTa="Quà tặng, voucher chờ thẩm định và đơn trùng nguồn sẽ hiện ở đây." />;

  return (
    <div className="flex flex-col gap-6">
      {loi && <ThongBaoNoiDong kieu="canh-bao">{loi}</ThongBaoNoiDong>}

      {duLieu.don_cho_xac_minh.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="m-0 text-h2 text-chu">Đơn trùng nguồn chờ xác minh</h2>
          <p className="m-0 text-sm text-chu-phu">Mỗi đơn chỉ ghi nhận một người bán. Chọn người được ghi nhận rồi gửi đề xuất — hoa hồng chỉ phát sinh sau khi duyệt.</p>
          {duLieu.don_cho_xac_minh.map(d => {
            const ungVien = [
              d.nguoi_chot ? { id: d.nguoi_chot.id, nhan: `Sale chốt đơn: ${d.nguoi_chot.ho_ten}` } : null,
              d.nguoi_gioi_thieu ? { id: d.nguoi_gioi_thieu.id, nhan: `Mã giới thiệu ${d.ma_gioi_thieu ?? ""}: ${d.nguoi_gioi_thieu.ho_ten}` } : null
            ].filter((x): x is { id: string; nhan: string } => !!x && !!x.id);
            const daChon = chonBan[d.id] ?? "";
            return (
              <The key={d.id} className="flex flex-col gap-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <strong className="text-h3 text-chu">Đơn <span className="font-mono">{d.ma_don}</span></strong>
                  <span className="text-sm text-chu-phu">
                    {dinhDangTien(d.tong_tien)} · nguồn hiện tại {NHAN_NGUON_DON_QT[d.nguon]} · {dinhDangNgayGio(d.created_at)}
                  </span>
                </div>
                {d.ly_do && <p className="m-0 text-sm text-chu-phu">{d.ly_do}</p>}
                <div role="radiogroup" aria-label={`Người bán đơn ${d.ma_don}`} className="flex flex-col gap-2">
                  {[...ungVien, { id: "HUY", nhan: "Huỷ ghi nhận (không tính cho ai)" }].map(u => (
                    <label key={u.id} className={cn("flex min-h-[44px] cursor-pointer items-center gap-3 rounded-lg border px-4 text-sm transition-colors duration-nhanh", daChon === u.id ? "border-chinh bg-chinh-nhat font-semibold text-chinh-dam" : "border-vien-dam bg-be-mat text-chu hover:bg-be-mat-phu")}>
                      <input type="radio" className="accent-chinh" name={`ban-${d.id}`} value={u.id} checked={daChon === u.id} onChange={() => setChonBan(s => ({ ...s, [d.id]: u.id }))} />
                      {u.nhan}
                    </label>
                  ))}
                </div>
                <div className="flex justify-end">
                  <Nut
                    co="nho"
                    disabled={!daChon}
                    dangXuLy={dangGui === d.id}
                    onClick={() =>
                      void lap(
                        d.id,
                        { loai: "XAC_MINH_DON", doi_tuong_id: d.id, du_lieu: daChon === "HUY" ? { ket_qua: "HUY" } : { ket_qua: "GHI_NHAN", nguoi_ban_ho_so_id: daChon } },
                        `Đã lập đề xuất xác minh đơn ${d.ma_don}.`
                      )
                    }
                  >
                    Lập đề xuất xác minh
                  </Nut>
                </div>
              </The>
            );
          })}
        </section>
      )}

      {duLieu.qua_tang.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="m-0 text-h2 text-chu">Quà tặng đối tác chờ thẩm định</h2>
          {duLieu.qua_tang.map(q => (
            <The key={q.id} className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-col gap-1">
                <strong className="text-h4 text-chu">{q.ten}</strong>
                <span className="text-sm text-chu-phu">
                  {[q.doi_tac, q.gia_tri !== null ? dinhDangTien(q.gia_tri) : null, q.so_luong !== null ? `${q.so_luong} phần` : null].filter(Boolean).join(" · ")}
                </span>
              </div>
              <Nut co="nho" dangXuLy={dangGui === q.id} onClick={() => void lap(q.id, { loai: "DUYET_QUA_TANG", doi_tuong_id: q.id, du_lieu: {} }, `Đã lập đề xuất duyệt quà "${q.ten}".`)}>
                Lập đề xuất duyệt
              </Nut>
            </The>
          ))}
        </section>
      )}

      {duLieu.voucher.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="m-0 text-h2 text-chu">Voucher chờ thẩm định</h2>
          {duLieu.voucher.map(v => (
            <The key={v.id} className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-col gap-1">
                <strong className="text-h4 text-chu">
                  {v.ma} · {v.ten}
                </strong>
                <span className="text-sm text-chu-phu">
                  {[v.doi_tac, v.loai_giam === "PHAN_TRAM" ? `Giảm ${v.gia_tri}%` : `Giảm ${dinhDangTien(v.gia_tri)}`].filter(Boolean).join(" · ")}
                </span>
              </div>
              <Nut co="nho" dangXuLy={dangGui === v.id} onClick={() => void lap(v.id, { loai: "DUYET_VOUCHER", doi_tuong_id: v.id, du_lieu: {} }, `Đã lập đề xuất duyệt voucher ${v.ma}.`)}>
                Lập đề xuất duyệt
              </Nut>
            </The>
          ))}
        </section>
      )}
    </div>
  );
}

