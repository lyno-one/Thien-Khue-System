"use client";

import type { HangTienDoDoi, PhanTrangMeta, TongHopTienDoDoi, TrangThaiHocVien, Vai } from "@thien-khue/contracts";
import { NHAN_TRANG_THAI_HOC_VIEN, NHAN_VAI } from "@thien-khue/contracts";
import { useState } from "react";
import { Bang, DangTai, KhungCho, Loi, Nhan, NutLienKet, The, TheSoLieu, TieuDeTrang, type TongNhan } from "@/components/ui";
import { BoLoc, PhanTrang, ThanhTienDo, useTaiDuLieu } from "@/features/quan-tri/dung-chung";
import { api } from "@/lib/api";

/*
 * Bang dieu hanh dao tao cho MENTOR / QUAN_LY — bam "Bảng điều hành đào tạo" trong LMS.dc.html:
 * 4 o so lieu (meta.tong_hop), bo loc dang tab theo lo trinh, bang hoc vien. Du lieu: GET /api/dao-tao/tien-do-doi.
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

const TONG_TRANG_THAI: Record<TrangThaiHocVien, TongNhan> = {
  HOAN_THANH: "thanh-cong",
  DANG_HOC: "chinh",
  CHUA_BAT_DAU: "trung-tinh",
  CAN_HO_TRO: "canh-bao"
};

type MetaTienDo = PhanTrangMeta & { tong_hop?: TongHopTienDoDoi };

export function ManTienDoDoi() {
  const [loc, setLoc] = useState<"TAT_CA" | Vai>("TAT_CA");
  const [trang, setTrang] = useState(1);
  const ds = useTaiDuLieu(
    () => api.layCoMeta<HangTienDoDoi[], MetaTienDo>("/dao-tao/tien-do-doi", { trang, so_dong: 20, vai: loc === "TAT_CA" ? undefined : loc }),
    [loc, trang]
  );
  const th = ds.duLieu?.meta?.tong_hop;

  return (
    <div className="flex flex-col gap-8 [&>header]:mb-0">
      <TieuDeTrang
        kicker="Học viện"
        tieuDe="Bảng điều hành đào tạo"
        moTa="Tiến độ học, bài kiểm tra và bài thực hành chờ chấm của đội — số liệu thật."
        hanhDong={
          <NutLienKet href="/hoc-vien/cham-bai">
            Chấm bài thực hành
          </NutLienKet>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {!th && ds.dangTai ? (
          [0, 1, 2, 3].map(i => <KhungCho key={i} className="h-[108px]" />)
        ) : (
          <>
            <TheSoLieu nhan="Học viên" giaTri={(th?.hoc_vien ?? 0).toLocaleString("vi-VN")} />
            <TheSoLieu nhan="Tiến độ trung bình" giaTri={`${th?.tien_do_trung_binh ?? 0}%`} />
            <TheSoLieu nhan="Hoàn thành" giaTri={(th?.hoan_thanh ?? 0).toLocaleString("vi-VN")} />
            <TheSoLieu nhan="Cần hỗ trợ" giaTri={<span className={(th?.can_ho_tro ?? 0) > 0 ? "text-loi" : undefined}>{(th?.can_ho_tro ?? 0).toLocaleString("vi-VN")}</span>} />
          </>
        )}
      </div>

      <section aria-labelledby="tieu-de-tien-do" className="flex flex-col gap-4">
        <h2 id="tieu-de-tien-do" className="m-0 text-h2 text-chu">
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
        {ds.loi ? (
          <Loi chiTiet={ds.loi} thuLai={() => void ds.taiLai()} />
        ) : !ds.duLieu && ds.dangTai ? (
          <DangTai />
        ) : (
          <>
            <Bang<HangTienDoDoi>
              dong={ds.duLieu?.data ?? []}
              khoaDong={r => r.ho_so_id}
              cot={[
                { khoa: "ten", tieuDe: "Học viên", hienThi: r => <span className="font-medium">{r.ho_ten}</span> },
                {
                  khoa: "lo_trinh",
                  tieuDe: "Lộ trình",
                  hienThi: r => <span className="text-chu-phu">{r.lo_trinh.join(", ") || r.vai.map(v => NHAN_VAI[v.vai]).join(" / ") || "—"}</span>
                },
                { khoa: "tien_do", tieuDe: "Tiến độ", hienThi: r => <ThanhTienDo phanTram={r.phan_tram} /> },
                { khoa: "kiem_tra", tieuDe: "Bài kiểm tra", hienThi: r => <span className="text-chu-phu">{r.kiem_tra}</span> },
                { khoa: "sku", tieuDe: "Quyền SKU", canPhai: true, hienThi: r => r.so_quyen_sku.toLocaleString("vi-VN") },
                { khoa: "trang_thai", tieuDe: "Trạng thái", hienThi: r => <Nhan tong={TONG_TRANG_THAI[r.trang_thai]}>{NHAN_TRANG_THAI_HOC_VIEN[r.trang_thai]}</Nhan> }
              ]}
              rong={<The className="text-center text-sm text-chu-mo">Chưa có học viên ở lộ trình này.</The>}
            />
            <PhanTrang meta={ds.duLieu?.meta} doiTrang={setTrang} />
          </>
        )}
      </section>
    </div>
  );
}
