"use client";

import type { NguoiHocDongQt, PhanTrangMeta, TongQuanQuanTri, TrangThaiNguoiHocQt, Vai } from "@thien-khue/contracts";
import { NHAN_NGUON_DON_QT, NHAN_TRANG_THAI_NGUOI_HOC_QT } from "@thien-khue/contracts";
import { useState } from "react";
import { Bang, DangTai, KhungCho, Loi, lopTrong, Nhan, NutLienKet, The, TheTieuDe, TieuDeTrang, type TongNhan } from "@/components/ui";
import { api } from "@/lib/api";
import { dinhDangTien } from "@/lib/dinh-dang";
import { BoLoc, PhanTrang, tenVai, ThanhTienDo, useTaiDuLieu } from "./dung-chung";

/*
 * Bang dieu hanh quan tri — bam "Bảng điều hành đào tạo" trong LMS.dc.html:
 * tieu de + nut ben phai, dai 4 so (CRM DESIGN.md "Dai so"), bo loc dang tab theo lo trinh, bang hoc vien (tien do / bai kiem tra / trang thai).
 * Them hang so lieu van hanh: don theo nguon, hoa hong cho, de xuat cho.
 */

const LOC_LO_TRINH: { giaTri: "TAT_CA" | Vai; nhan: string }[] = [
  { giaTri: "TAT_CA", nhan: "Tất cả" },
  { giaTri: "SALE", nhan: "Sale" },
  { giaTri: "CSKH", nhan: "CSKH" },
  { giaTri: "CTV", nhan: "CTV online" },
  { giaTri: "THUC_TAP", nhan: "Thực tập sinh" },
  { giaTri: "KOL", nhan: "KOL" },
  { giaTri: "KOC", nhan: "KOC" }
];

const TONG_NGUOI_HOC: Record<TrangThaiNguoiHocQt, TongNhan> = {
  HOAN_THANH: "thanh-cong",
  DANG_HOC: "chinh",
  CHUA_BAT_DAU: "trung-tinh",
  CAN_HO_TRO: "canh-bao"
};

export function BangDieuHanh() {
  const tq = useTaiDuLieu(() => api.get<TongQuanQuanTri>("/quan-tri/tong-quan"), []);
  const [loc, setLoc] = useState<"TAT_CA" | Vai>("TAT_CA");
  const [trang, setTrang] = useState(1);
  const nh = useTaiDuLieu(
    () => api.layCoMeta<NguoiHocDongQt[], PhanTrangMeta>("/quan-tri/nguoi-hoc", { trang, so_dong: 20, vai: loc === "TAT_CA" ? undefined : loc }),
    [loc, trang]
  );
  const t = tq.duLieu;
  const choXuLy = t ? t.de_xuat.can_toi : 0;

  return (
    <div className="flex flex-col gap-6">
      <TieuDeTrang
        kicker="Quản trị"
        tieuDe="Bảng điều hành"
        moTa="Người học, giao dịch và các quyết định đang chờ — số liệu thật từ Thiên Khuê và CRM Lyno."
        hanhDong={
          <NutLienKet href="/quan-tri/phe-duyet">
            Bàn phê duyệt{choXuLy ? ` · ${choXuLy}` : ""}
          </NutLienKet>
        }
      />

      {tq.loi && <Loi chiTiet={tq.loi} thuLai={() => void tq.taiLai()} />}

      {/* Dai 4 so (DESIGN.md "Dai so"): mot khung, cac o ngan bang vach vien — 2x2 duoi lg, 1 hang tu lg */}
      {!t && tq.dangTai ? (
        <KhungCho className="h-[208px] lg:h-[112px]" />
      ) : t ? (
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-vien bg-vien lg:grid-cols-4">
          <OSo nhan="Người học" giaTri={t.nguoi_hoc.tong.toLocaleString("vi-VN")} phu={`${t.nguoi_hoc.dang_hoc} đang học`} />
          <OSo nhan="Tỷ lệ đạt bài kiểm tra" giaTri={t.ty_le_dat === null ? "—" : `${t.ty_le_dat}%`} phu={`${t.luot_lam.dat}/${t.luot_lam.tong} lượt đạt`} />
          <OSo nhan="Đã kích hoạt làm việc" giaTri={t.nguoi_hoc.hoat_dong.toLocaleString("vi-VN")} phu="Mọi vai đã hoạt động" />
          <OSo nhan="Hoa hồng chờ đối soát" giaTri={dinhDangTien(t.hoa_hong_cho.so_tien)} phu={`${t.hoa_hong_cho.so_dong} khoản`} />
        </div>
      ) : null}

      {t && (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <The>
            <TheTieuDe kicker="Giao dịch" tieuDe="Đơn theo nguồn" moTa="Đơn đã ghi nhận người bán (không tính đơn bị huỷ ghi nhận)." />
            <DonTheoNguon ds={t.don_theo_nguon} />
          </The>
          <The>
            <TheTieuDe kicker="Phê duyệt" tieuDe="Đang chờ quyết định" />
            <ul className="m-0 flex list-none flex-col gap-3 p-0 text-sm">
              <DongCho nhan="Đề xuất tiền chờ kiểm" so={t.de_xuat.cho_kiem} />
              <DongCho nhan="Đề xuất chờ duyệt" so={t.de_xuat.cho_duyet} />
              <DongCho nhan="Việc của bạn" so={t.de_xuat.can_toi} noiBat />
              <DongCho nhan="Đơn trùng nguồn chờ xác minh" so={t.don_cho_xac_minh} />
              <DongCho nhan="Quà tặng chờ thẩm định" so={t.qua_cho_tham_dinh} />
            </ul>
          </The>
        </div>
      )}

      <section aria-labelledby="tieu-de-nguoi-hoc" className="flex flex-col gap-4">
        <h2 id="tieu-de-nguoi-hoc" className="m-0 text-h2 text-chu">
          Học viên theo lộ trình
        </h2>
        <BoLoc
          nhanAria="Lọc theo lộ trình"
          luaChon={LOC_LO_TRINH}
          giaTri={loc}
          doi={v => {
            setLoc(v);
            setTrang(1);
          }}
        />
        {nh.loi ? (
          <Loi chiTiet={nh.loi} thuLai={() => void nh.taiLai()} />
        ) : !nh.duLieu && nh.dangTai ? (
          <DangTai />
        ) : (
          <>
            <Bang<NguoiHocDongQt>
              dong={nh.duLieu?.data ?? []}
              khoaDong={r => r.ho_so_id}
              cot={[
                { khoa: "ten", tieuDe: "Học viên", hienThi: r => <span className="font-medium text-chu">{r.ho_ten}</span> },
                { khoa: "lo_trinh", tieuDe: "Lộ trình", hienThi: r => <span className="text-chu-phu">{r.vai.map(v => tenVai(v.vai)).join(" / ") || "—"}</span> },
                { khoa: "tien_do", tieuDe: "Tiến độ", hienThi: r => <ThanhTienDo phanTram={r.tien_do} /> },
                {
                  khoa: "kiem_tra",
                  tieuDe: "Bài kiểm tra",
                  hienThi: r => <span className="so text-chu-phu">{r.tong_bai_kiem_tra ? `${r.bai_kiem_tra_dat}/${r.tong_bai_kiem_tra}` : "—"}</span>
                },
                { khoa: "trang_thai", tieuDe: "Trạng thái", hienThi: r => <Nhan tong={TONG_NGUOI_HOC[r.trang_thai]}>{NHAN_TRANG_THAI_NGUOI_HOC_QT[r.trang_thai]}</Nhan> }
              ]}
              rong={<div className={lopTrong}>Chưa có học viên ở lộ trình này.</div>}
            />
            <PhanTrang meta={nh.duLieu?.meta} doiTrang={setTrang} />
          </>
        )}
      </section>
    </div>
  );
}

function DonTheoNguon({ ds }: { ds: TongQuanQuanTri["don_theo_nguon"] }) {
  const max = Math.max(1, ...ds.map(d => d.so_don));
  return (
    <ul className="m-0 flex list-none flex-col gap-4 p-0">
      {ds.map(d => (
        <li key={d.nguon} className="flex flex-col gap-1">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="font-medium text-chu">{NHAN_NGUON_DON_QT[d.nguon]}</span>
            <span className="so text-chu-phu">
              {d.so_don.toLocaleString("vi-VN")} đơn · {dinhDangTien(d.tong_tien)}
            </span>
          </div>
          <div className="h-3 overflow-hidden rounded bg-be-mat-phu" aria-hidden>
            <div className="h-full rounded bg-chinh" style={{ width: `${(d.so_don / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function DongCho({ nhan, so, noiBat }: { nhan: string; so: number; noiBat?: boolean }) {
  return (
    <li className="flex items-center justify-between gap-3 border-b border-vien pb-3 last:border-b-0 last:pb-0">
      <span className={noiBat ? "font-semibold text-chu" : "text-chu-phu"}>{nhan}</span>
      {so ? <Nhan tong={noiBat ? "loi" : "canh-bao"}>{so.toLocaleString("vi-VN")}</Nhan> : <span className="text-sm text-chu-mo">Không có</span>}
    </li>
  );
}

/** O trong dai so: dem 20, nhan 14 chu-phu, so text-so (tu sm) tabular, dong phu 12 chu-mo. Khong icon. */
function OSo({ nhan, giaTri, phu }: { nhan: string; giaTri: string; phu: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-2 bg-be-mat p-4 sm:p-5">
      <span className="text-sm text-chu-phu">{nhan}</span>
      <span className="so break-words text-h2 text-chu sm:text-so">{giaTri}</span>
      <span className="text-xs text-chu-mo">{phu}</span>
    </div>
  );
}
