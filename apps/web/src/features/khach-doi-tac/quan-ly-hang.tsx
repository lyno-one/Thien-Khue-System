"use client";

import type { CauHinhHang, TraCuuHang } from "@thien-khue/contracts";
import Link from "next/link";
import { useState } from "react";
import { Bang, DangTai, HopThoai, Loi, Nhan, Nut, ONhap, OVanBan, The, TheSoLieu, TheTieuDe, ThongBaoNoiDong } from "@/components/ui";
import { dinhDangNgay, dinhDangTien } from "@/lib/dinh-dang";
import { useXacThuc } from "@/providers/auth-provider";
import { KhoiXacMinhSdt } from "@/features/ho-so/xac-minh-sdt";
import { apiKdt, laThienKhueThat, useTai, useThaoTac } from "./api";
import { NhanHang } from "./hien-thi";

/**
 * Tab Hang the: tra cuu hang theo SDT + xac minh SDT tai khoan khach (CSKH / Quan ly)
 * + cau hinh hang (Thien Khue THAT sua ten / quyen loi / bat-tat; nguong & % giam qua ban phe duyet).
 */
export function QuanLyHang() {
  const { nguoiDung, coVai } = useXacThuc();
  const cauHinh = useTai(apiKdt.cauHinh);
  const [dangSua, setDangSua] = useState<CauHinhHang | null>(null);
  const duocSua = laThienKhueThat(nguoiDung);

  return (
    <div className="flex flex-col gap-8">
      <TraCuu />
      {coVai("CSKH", "QUAN_LY") && <KhoiXacMinhSdt />}
      <The>
        <TheTieuDe kicker="Chính sách" tieuDe="Ngưỡng hạng thẻ" moTa="Tích luỹ = tổng đơn BAN_HANG không huỷ / hoàn trên CRM. Đổi ngưỡng hoặc % giảm phải lập đề xuất “Đổi chính sách” ở Bàn phê duyệt; duyệt xong hạng tính lại ngay." />
        {cauHinh.dangTai && !cauHinh.data ? (
          <DangTai />
        ) : cauHinh.loi ? (
          <Loi chiTiet={cauHinh.loi} thuLai={() => void cauHinh.taiLai()} />
        ) : (
          <Bang
            dong={cauHinh.data ?? []}
            khoaDong={c => c.id}
            cot={[
              { khoa: "hang", tieuDe: "Hạng", hienThi: c => <NhanHang hang={c.hang} /> },
              { khoa: "ten", tieuDe: "Tên hiển thị" },
              { khoa: "nguong", tieuDe: "Ngưỡng tích luỹ", canPhai: true, hienThi: c => dinhDangTien(c.nguong_tich_luy) },
              { khoa: "giam", tieuDe: "Giảm giá", canPhai: true, hienThi: c => `${c.giam_gia_phan_tram}%` },
              { khoa: "quyen_loi", tieuDe: "Quyền lợi thêm", hienThi: c => c.quyen_loi ?? "—" },
              { khoa: "bat", tieuDe: "Trạng thái", hienThi: c => (c.bat ? <Nhan tong="thanh-cong">Đang áp dụng</Nhan> : <Nhan tong="trung-tinh">Tắt</Nhan>) },
              ...(duocSua
                ? [
                    {
                      khoa: "sua",
                      tieuDe: "",
                      canPhai: true,
                      hienThi: (c: CauHinhHang) => (
                        <Nut kieu="vien" co="nho" onClick={() => setDangSua(c)}>
                          Sửa
                        </Nut>
                      )
                    }
                  ]
                : [])
            ]}
          />
        )}
        {!duocSua && <p className="mb-0 mt-4 text-sm text-chu-phu">Chỉ Thiên Khuê được sửa thông tin hạng thẻ (Quản trị viên không sửa thay).</p>}
      </The>
      {dangSua && (
        <HopThoaiSuaHang
          ch={dangSua}
          dong={() => setDangSua(null)}
          xong={() => {
            setDangSua(null);
            void cauHinh.taiLai();
          }}
        />
      )}
    </div>
  );
}

function TraCuu() {
  const [sdt, setSdt] = useState("");
  const [kq, setKq] = useState<TraCuuHang | null>(null);
  const tt = useThaoTac();
  const traCuu = async (e: React.FormEvent) => {
    e.preventDefault();
    setKq(null);
    const r = await tt.chay(() => apiKdt.traCuu(sdt));
    if (r) setKq(r);
  };
  return (
    <The>
      <TheTieuDe kicker="Tra cứu" tieuDe="Hạng của khách" moTa="Sale / CSKH chỉ tra cứu được khách đang được giao cho mình." />
      <form onSubmit={e => void traCuu(e)} className="flex flex-wrap items-end gap-3">
        <ONhap nhan="Số điện thoại" type="tel" inputMode="tel" placeholder="09xx xxx xxx" value={sdt} onChange={e => setSdt(e.target.value)} lopKhung="min-w-[220px] flex-1" />
        <Nut type="submit" dangXuLy={tt.dangXuLy} disabled={!sdt.trim()}>
          Tra cứu
        </Nut>
      </form>
      {tt.loi && <ThongBaoNoiDong kieu="loi" className="mt-4">{tt.loi}</ThongBaoNoiDong>}
      {kq && (
        <div className="mt-6 flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <strong className="text-h3">{kq.ten_khach ?? "Khách chưa có hồ sơ CRM"}</strong>
            <span className="text-chu-phu">{kq.sdt_chuan}</span>
            <NhanHang hang={kq.hang} />
            {kq.du_dieu_kien_hanh_phuc && <Nhan tong="chinh">Đủ điều kiện KH hạnh phúc</Nhan>}
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <TheSoLieu nhan="Tích luỹ hợp lệ" giaTri={dinhDangTien(kq.tong_mua_hop_le)} />
            <TheSoLieu nhan="Số đơn hợp lệ" giaTri={kq.so_don_hop_le} phu={kq.lan_mua_cuoi ? `Gần nhất ${dinhDangNgay(kq.lan_mua_cuoi)}` : undefined} />
            <TheSoLieu
              nhan="Giảm theo hạng"
              giaTri={`${kq.giam_gia_phan_tram}%`}
              phu={kq.hang_tiep_theo ? `Còn ${dinhDangTien(kq.hang_tiep_theo.con_thieu)} lên ${kq.hang_tiep_theo.ten}` : "Hạng cao nhất"}
            />
          </div>
        </div>
      )}
    </The>
  );
}

function HopThoaiSuaHang({ ch, dong, xong }: { ch: CauHinhHang; dong: () => void; xong: () => void }) {
  const [ten, setTen] = useState(ch.ten);
  const [quyenLoi, setQuyenLoi] = useState(ch.quyen_loi ?? "");
  const [bat, setBat] = useState(ch.bat);
  const tt = useThaoTac();
  const luu = async () => {
    const r = await tt.chay(() =>
      apiKdt.capNhatCauHinh(ch.hang, { ten: ten.trim(), quyen_loi: quyenLoi.trim() || null, bat })
    );
    if (r) xong();
  };
  return (
    <HopThoai
      mo
      dong={dong}
      tieuDe={`Sửa hạng ${ch.ten}`}
      moTa="Sửa tên, quyền lợi thêm, bật / tắt hạng — ghi nhật ký. Ngưỡng tích luỹ và % giảm là chính sách: lập đề xuất “Đổi chính sách — ngưỡng hạng” ở Bàn phê duyệt."
      chanTrang={
        <>
          <Nut kieu="trong" onClick={dong}>
            Huỷ
          </Nut>
          <Nut onClick={() => void luu()} dangXuLy={tt.dangXuLy}>
            Lưu
          </Nut>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {tt.loi && <ThongBaoNoiDong kieu="loi">{tt.loi}</ThongBaoNoiDong>}
        <ONhap nhan="Tên hiển thị" value={ten} onChange={e => setTen(e.target.value)} batBuoc />
        <p className="m-0 text-sm text-chu-phu">
          Ngưỡng hiện tại {dinhDangTien(ch.nguong_tich_luy)} · giảm {ch.giam_gia_phan_tram}%.{" "}
          <Link href="/quan-tri/phe-duyet" className="font-medium text-chinh hover:text-chinh-dam hover:underline">
            Đổi qua Bàn phê duyệt →
          </Link>
        </p>
        <OVanBan nhan="Quyền lợi thêm" rows={3} value={quyenLoi} onChange={e => setQuyenLoi(e.target.value)} />
        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" checked={bat} onChange={e => setBat(e.target.checked)} className="h-5 w-5 accent-chinh" /> Đang áp dụng
        </label>
      </div>
    </HopThoai>
  );
}
