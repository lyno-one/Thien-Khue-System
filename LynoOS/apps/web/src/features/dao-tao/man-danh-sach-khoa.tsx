"use client";

import { useState } from "react";
import { KhungCho, Loi, lopKicker, lopThanhTab, lopThe, NutLienKet, TieuDeTrang, Trong } from "@/components/ui";
import { cn } from "@/lib/cn";
import { useDsKhoaHoc } from "./hooks";
import type { LoaiKhoaHoc } from "./kieu";
import { NutLoc, ThanhTienDo } from "./thanh-phan";
import { biaKhoa, NHAN_LOC_LOAI, nhanKhoa, nhanNutKhoa, soThuTu } from "./tinh-toan";

const LOAI: LoaiKhoaHoc[] = ["NEN_TANG", "NGHIEP_VU", "SAN_PHAM"];

/** Danh sach khoa hoc (LMS — man "Khóa học") */
export function ManDanhSachKhoa() {
  const { data, dangTai, loi, taiLai } = useDsKhoaHoc();
  const [loc, setLoc] = useState<LoaiKhoaHoc | "TAT_CA">("TAT_CA");

  const ds = [...(data ?? [])].sort((a, b) => a.thu_tu - b.thu_tu);
  const coLoai = LOAI.filter(l => ds.some(k => k.loai === l));
  const hien = ds.filter(k => loc === "TAT_CA" || k.loai === loc);

  return (
    <div className="flex flex-col">
      <TieuDeTrang tieuDe="Khóa học" moTa="Mọi vai trò bắt đầu từ khóa Nhập môn, sau đó chọn lộ trình chuyên sâu." />

      {coLoai.length > 1 && (
        <div className={cn(lopThanhTab, "mb-6 self-start")} role="group" aria-label="Lọc theo loại khóa">
          <NutLoc dangChon={loc === "TAT_CA"} onClick={() => setLoc("TAT_CA")}>
            Tất cả
          </NutLoc>
          {coLoai.map(l => (
            <NutLoc key={l} dangChon={loc === l} onClick={() => setLoc(l)}>
              {NHAN_LOC_LOAI[l]}
            </NutLoc>
          ))}
        </div>
      )}

      {dangTai ? (
        <div className="grid gap-5 md:grid-cols-2">
          {[0, 1, 2, 3].map(i => (
            <KhungCho key={i} className="h-[320px]" />
          ))}
        </div>
      ) : loi && !data ? (
        <Loi tieuDe="Không tải được danh sách khóa học" chiTiet={loi} thuLai={taiLai} />
      ) : !hien.length ? (
        <Trong tieuDe="Chưa có khóa học" moTa="Khóa học áp cho vai trò của bạn sẽ hiện ở đây." />
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {hien.map(k => {
            const bia = biaKhoa(k.loai);
            const viTri = ds.indexOf(k);
            return (
              <article key={k.id} className={cn(lopThe, "tk-lift flex flex-col overflow-hidden")}>
                <div className={cn("relative flex h-28 items-end overflow-hidden border-b border-vien px-4 py-4 md:px-5", bia.nen, bia.chu)}>
                  <svg viewBox="0 0 300 112" width="100%" height="112" preserveAspectRatio="none" aria-hidden className={cn("absolute inset-0", bia.dai)}>
                    <path d="M-10 90 C 60 30, 120 120, 190 56 S 280 16, 320 48" fill="none" stroke="currentColor" strokeWidth="16" strokeLinecap="round" />
                  </svg>
                  <span className="so relative text-hien-thi leading-none">{k.ma_mau ?? soThuTu(viTri)}</span>
                </div>
                <div className="flex flex-grow flex-col gap-2 p-4 md:p-5">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-chu-phu">
                    <span className={cn(lopKicker, "text-chinh-dam")}>{nhanKhoa(k)}</span>
                    <span>{k.so_bai} bài học</span>
                    {k.co_bai_kiem_tra && <span>· Có bài kiểm tra</span>}
                    {k.can_thuc_hanh && <span>· Có thực hành</span>}
                  </div>
                  <h2 className="m-0 text-h3 text-chu">{k.ten}</h2>
                  {k.mo_ta && <p className="m-0 text-sm text-chu-phu">{k.mo_ta}</p>}
                  <div className="mt-auto flex flex-col gap-3 pt-2">
                    <ThanhTienDo phanTram={k.tien_do.phan_tram} nhan={`Tiến độ ${k.ten}`} />
                    <div className="flex items-center justify-between gap-3">
                      <span className={cn("text-xs", k.tien_do.trang_thai === "CAN_HOC_LAI" ? "font-medium text-canh-bao" : k.tien_do.trang_thai === "HOAN_THANH" ? "font-medium text-thanh-cong" : "text-chu-phu")}>
                        {k.tien_do.trang_thai === "HOAN_THANH" ? "Đã hoàn thành" : k.tien_do.trang_thai === "CAN_HOC_LAI" ? "Cần học lại" : `${k.tien_do.phan_tram}% hoàn thành`}
                      </span>
                      <NutLienKet href={`/hoc-vien/khoa-hoc/${k.id}`} className="shrink-0">
                        {nhanNutKhoa(k)}
                      </NutLienKet>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
