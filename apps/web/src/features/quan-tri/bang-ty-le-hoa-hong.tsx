"use client";

import type { BangTyLeHoaHong, TrangThaiTyLeHoaHong, TyLeHoaHongQt } from "@thien-khue/contracts";
import { useMemo, useState } from "react";
import { Bang, DangTai, Loi, Nhan, NutLienKet, The, TheTieuDe, TieuDeTrang } from "@/components/ui";
import { api } from "@/lib/api";
import { dinhDangNgay } from "@/lib/dinh-dang";
import { BoLoc, tenVai, useTaiDuLieu } from "./dung-chung";

/*
 * Bang ty le hoa hong (chi doc): ty le dang ap dung + lich su. Doi ty le = lap de xuat "Doi chinh sach"
 * o Ban phe duyet (Thien Khue duyet) — khong sua truc tiep o day.
 */

type Loc = "DANG_AP_DUNG" | "TAT_CA";

const NHAN_TRANG_THAI: Record<TrangThaiTyLeHoaHong, [string, "thanh-cong" | "canh-bao" | "trung-tinh"]> = {
  DANG_AP_DUNG: ["Đang áp dụng", "thanh-cong"],
  CHUA_TOI: ["Chưa tới hạn", "canh-bao"],
  DA_HET: ["Đã hết hiệu lực", "trung-tinh"]
};

function PhamVi({ r }: { r: TyLeHoaHongQt }) {
  return r.ma_mau ? <code className="font-semibold text-chinh">{r.ma_mau}</code> : <span className="text-chu-phu">Mọi sản phẩm</span>;
}

export function TrangTyLeHoaHong() {
  const [loc, setLoc] = useState<Loc>("DANG_AP_DUNG");
  const tl = useTaiDuLieu(() => api.get<BangTyLeHoaHong>("/quan-tri/phe-duyet/ty-le-hoa-hong"), []);
  const dong = useMemo(() => (tl.duLieu?.ty_le ?? []).filter(r => loc === "TAT_CA" || r.trang_thai === "DANG_AP_DUNG"), [tl.duLieu, loc]);
  const soDangAp = (tl.duLieu?.ty_le ?? []).filter(r => r.trang_thai === "DANG_AP_DUNG").length;

  return (
    <div className="flex flex-col gap-6">
      <TieuDeTrang
        kicker="Quản trị"
        tieuDe="Tỷ lệ hoa hồng"
        moTa="Tỷ lệ theo vai và sản phẩm đang áp dụng, kèm lịch sử các lần đổi. Muốn đổi, lập đề xuất “Đổi chính sách” ở Bàn phê duyệt — Thiên Khuê duyệt xong mới áp dụng."
        hanhDong={
          <NutLienKet href="/quan-tri/phe-duyet" kieu="vien" co="nho">
            Lập đề xuất đổi tỷ lệ
          </NutLienKet>
        }
      />
      <The>
        <TheTieuDe kicker="Bảng tỷ lệ" tieuDe={loc === "DANG_AP_DUNG" ? `Đang áp dụng (${soDangAp})` : "Toàn bộ lịch sử"} />
        <div className="mb-4">
          <BoLoc
            nhanAria="Lọc tỷ lệ"
            giaTri={loc}
            doi={setLoc}
            luaChon={[
              { giaTri: "DANG_AP_DUNG", nhan: "Đang áp dụng" },
              { giaTri: "TAT_CA", nhan: "Cả lịch sử" }
            ]}
          />
        </div>
        {tl.loi ? (
          <Loi chiTiet={tl.loi} thuLai={() => void tl.taiLai()} />
        ) : !tl.duLieu && tl.dangTai ? (
          <DangTai />
        ) : (
          <Bang<TyLeHoaHongQt>
            dong={dong}
            khoaDong={r => r.id}
            rong={<p className="m-0 text-sm text-chu-phu">Chưa có tỷ lệ nào.</p>}
            cot={[
              { khoa: "vai", tieuDe: "Vai", hienThi: r => tenVai(r.vai) },
              { khoa: "sp", tieuDe: "Sản phẩm", hienThi: r => <PhamVi r={r} /> },
              { khoa: "ty_le", tieuDe: "Tỷ lệ", canPhai: true, hienThi: r => <strong className="so">{r.ty_le}%</strong> },
              { khoa: "tu", tieuDe: "Từ ngày", hienThi: r => dinhDangNgay(r.hieu_luc_tu) },
              { khoa: "den", tieuDe: "Đến ngày", hienThi: r => (r.hieu_luc_den ? dinhDangNgay(r.hieu_luc_den) : "—") },
              { khoa: "tt", tieuDe: "Trạng thái", hienThi: r => <Nhan tong={NHAN_TRANG_THAI[r.trang_thai][1]}>{NHAN_TRANG_THAI[r.trang_thai][0]}</Nhan> },
              { khoa: "ghi_chu", tieuDe: "Ghi chú", hienThi: r => <span className="text-sm text-chu-phu">{r.ghi_chu ?? ""}</span> }
            ]}
          />
        )}
      </The>
    </div>
  );
}
