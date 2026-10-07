"use client";

import type { HangThanhVien } from "@thien-khue/contracts";
import { DANH_SACH_HANG_THANH_VIEN, NHAN_HANG_THANH_VIEN, NHAN_LOAI_DOI_TAC, NHAN_LOAI_HOP_DONG, NHAN_TRANG_THAI_HOP_DONG } from "@thien-khue/contracts";
import { useState } from "react";
import { YeuCauDangNhap } from "@/components/khung/yeu-cau-dang-nhap";
import { Bang, DangTai, HopThoai, Loi, lopChip, Nhan, Nut, ONhap, OVanBan, The, TheSoLieu, TheTieuDe, ThongBaoNoiDong, Trong } from "@/components/ui";
import { cn } from "@/lib/cn";
import { dinhDangNgay, dinhDangTien } from "@/lib/dinh-dang";
import { apiKdt, useTai, useThaoTac } from "./api";
import { LOP_KHU, moTaGiam, NhanDuyet, NhanHangApDung } from "./hien-thi";
import { KetQuaGon } from "./quan-ly-doi-tac";

/** Cong doi tac (vai DOI_TAC): so lieu tong hop cua chinh doi tac — KHONG co danh sach khach ca nhan */
export function CongDoiTac() {
  return (
    <YeuCauDangNhap vai={["DOI_TAC"]}>
      <NoiDung />
    </YeuCauDangNhap>
  );
}

function NoiDung() {
  const ds = useTai(apiKdt.doiTacCuaToi);
  const [deXuat, setDeXuat] = useState(false);
  if (ds.dangTai && !ds.data) return <DangTai />;
  if (ds.loi || !ds.data)
    return ds.loi?.includes("chưa gắn") ? (
      <Trong tieuDe="Tài khoản chưa gắn với đối tác" moTa="Liên hệ Thiên Khuê S để gắn tài khoản với doanh nghiệp của bạn." />
    ) : (
      <Loi chiTiet={ds.loi} thuLai={() => void ds.taiLai()} />
    );
  const { doi_tac: dt, bao_cao: bc, hop_dong, qua_tang, voucher } = ds.data;

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3 border-b border-vien pb-6">
        <span className={cn(lopChip, LOP_KHU.hanhPhuc, "self-start")}>Hạnh phúc CEO / Đối tác</span>
        <h1 className="m-0 text-h1 text-chu">{dt.ten}</h1>
        <p className="m-0 max-w-[720px] text-body text-chu-phu">
          {NHAN_LOAI_DOI_TAC[dt.loai]} · Số liệu dưới đây là tổng hợp. Thông tin khách hàng cá nhân được bảo mật và không chia sẻ cho đối tác.
        </p>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <TheSoLieu nhan="Doanh thu bán quà" giaTri={dinhDangTien(bc.doanh_thu_qua)} />
        <TheSoLieu nhan="Chi phí tài trợ" giaTri={dinhDangTien(bc.chi_phi_tai_tro)} />
        <TheSoLieu nhan="Lượt ưu đãi đã cấp" giaTri={bc.luot_cap.toLocaleString("vi-VN")} phu={`${bc.luot_dung.toLocaleString("vi-VN")} lượt đã dùng`} />
        <TheSoLieu nhan="Kết quả chiến dịch" giaTri={<span className="text-body font-normal"><KetQuaGon kq={bc.ket_qua_chien_dich} /></span>} />
      </div>

      <The>
        <TheTieuDe kicker="Hợp tác" tieuDe="Hợp đồng" />
        <Bang
          dong={hop_dong}
          khoaDong={h => h.id}
          cot={[
            { khoa: "ten", tieuDe: "Hợp đồng", hienThi: h => <span className="flex flex-col"><strong>{h.ten}</strong><span className="text-sm text-chu-phu">{NHAN_LOAI_HOP_DONG[h.loai]}</span></span> },
            { khoa: "dt", tieuDe: "Doanh thu quà", canPhai: true, hienThi: h => dinhDangTien(h.doanh_thu_qua) },
            { khoa: "cp", tieuDe: "Tài trợ", canPhai: true, hienThi: h => dinhDangTien(h.chi_phi_tai_tro) },
            { khoa: "han", tieuDe: "Thời hạn", hienThi: h => `${dinhDangNgay(h.bat_dau)} – ${dinhDangNgay(h.ket_thuc)}` },
            { khoa: "tt", tieuDe: "", hienThi: h => <Nhan tong={h.trang_thai === "HIEU_LUC" ? "thanh-cong" : "trung-tinh"}>{NHAN_TRANG_THAI_HOP_DONG[h.trang_thai]}</Nhan> }
          ]}
          rong={<p className="m-0 text-sm text-chu-phu">Chưa có hợp đồng.</p>}
        />
      </The>

      <The>
        <TheTieuDe
          kicker="Ưu đãi"
          tieuDe="Quà tặng & voucher của bạn"
          moTa="Quà mới cần Thiên Khuê thẩm định chất lượng và duyệt trước khi đến tay khách."
          hanhDong={
            <Nut co="nho" onClick={() => setDeXuat(true)}>
              Đề xuất quà
            </Nut>
          }
        />
        <Bang
          dong={[
            ...qua_tang.map(q => ({ id: q.id, loai: "Quà", ten: q.ten, uuDai: dinhDangTien(q.gia_tri), hang: q.hang_ap_dung, tt: q.trang_thai })),
            ...voucher.map(v => ({ id: v.id, loai: "Voucher", ten: `${v.ma} · ${v.ten}`, uuDai: moTaGiam(v.loai_giam, v.gia_tri), hang: v.hang_ap_dung, tt: v.trang_thai }))
          ]}
          khoaDong={x => x.id}
          cot={[
            { khoa: "loai", tieuDe: "Loại" },
            { khoa: "ten", tieuDe: "Tên", hienThi: x => <strong>{x.ten}</strong> },
            { khoa: "uuDai", tieuDe: "Giá trị" },
            { khoa: "hang", tieuDe: "Hạng", hienThi: x => <NhanHangApDung ds={x.hang} /> },
            { khoa: "tt", tieuDe: "Trạng thái", hienThi: x => <NhanDuyet tt={x.tt} /> }
          ]}
          rong={<p className="m-0 text-sm text-chu-phu">Chưa có quà hoặc voucher.</p>}
        />
      </The>
      {deXuat && (
        <HopThoaiDeXuatQua
          dong={() => setDeXuat(false)}
          xong={() => {
            setDeXuat(false);
            void ds.taiLai();
          }}
        />
      )}
    </div>
  );
}

function HopThoaiDeXuatQua({ dong, xong }: { dong: () => void; xong: () => void }) {
  const [ten, setTen] = useState("");
  const [moTa, setMoTa] = useState("");
  const [hinh, setHinh] = useState("");
  const [giaTri, setGiaTri] = useState("");
  const [soLuong, setSoLuong] = useState("");
  const [hang, setHang] = useState<HangThanhVien[]>(["VIP"]);
  const tt = useThaoTac();
  const gui = async () => {
    const r = await tt.chay(() =>
      apiKdt.taoQua({
        ten: ten.trim(),
        mo_ta: moTa.trim() || null,
        hinh_anh: hinh.trim() || null,
        gia_tri: giaTri ? Number(giaTri) : null,
        so_luong: soLuong ? Number(soLuong) : null,
        hang_ap_dung: hang
      })
    );
    if (r) xong();
  };
  return (
    <HopThoai
      mo
      dong={dong}
      tieuDe="Đề xuất quà tặng"
      chanTrang={
        <>
          <Nut kieu="trong" onClick={dong}>
            Huỷ
          </Nut>
          <Nut onClick={() => void gui()} dangXuLy={tt.dangXuLy} disabled={!ten.trim()}>
            Gửi thẩm định
          </Nut>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {tt.loi && <ThongBaoNoiDong kieu="loi">{tt.loi}</ThongBaoNoiDong>}
        <ONhap nhan="Tên quà" batBuoc value={ten} onChange={e => setTen(e.target.value)} />
        <OVanBan nhan="Mô tả" rows={3} value={moTa} onChange={e => setMoTa(e.target.value)} />
        <ONhap nhan="Link hình ảnh" value={hinh} onChange={e => setHinh(e.target.value)} />
        <div className="grid gap-4 sm:grid-cols-2">
          <ONhap nhan="Giá trị (đồng)" type="number" min={0} value={giaTri} onChange={e => setGiaTri(e.target.value)} />
          <ONhap nhan="Số lượng" type="number" min={0} value={soLuong} onChange={e => setSoLuong(e.target.value)} />
        </div>
        <fieldset className="m-0 flex flex-wrap gap-4 border-0 p-0">
          <legend className="mb-2 text-sm font-semibold">Dành cho hạng</legend>
          {DANH_SACH_HANG_THANH_VIEN.map(h => (
            <label key={h} className="flex min-h-[44px] items-center gap-2 text-sm">
              <input type="checkbox" className="h-5 w-5 accent-chinh" checked={hang.includes(h)} onChange={e => setHang(e.target.checked ? [...hang, h] : hang.filter(x => x !== h))} />
              {NHAN_HANG_THANH_VIEN[h]}
            </label>
          ))}
        </fieldset>
      </div>
    </HopThoai>
  );
}
