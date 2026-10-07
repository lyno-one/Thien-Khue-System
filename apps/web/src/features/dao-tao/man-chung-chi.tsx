"use client";

import { useId } from "react";
import { KhungCho, Loi, lopKicker, TieuDeTrang, Trong } from "@/components/ui";
import { cn } from "@/lib/cn";
import { dinhDangNgay } from "@/lib/dinh-dang";
import { useXacThuc } from "@/providers/auth-provider";
import { useChungChi, useLoTrinh } from "./hooks";
import type { ChungChi, KhoaHocTomTat } from "./kieu";
import { HinhThoi } from "./thanh-phan";
import { goiYChungChi } from "./tinh-toan";

interface OChungChi {
  khoaId: string;
  ten: string;
  cc: ChungChi | null;
  khoa: KhoaHocTomTat | null;
}

/** Hoa van lua (silk) tren chung chi da cap — net xanh nhat (currentColor) */
function HoaVanLua() {
  // id rieng moi the: nhieu chung chi tren mot trang khong dung chung id pattern
  const id = `tk-lua-${useId().replace(/:/g, "")}`;
  return (
    <svg width="100%" height="24" aria-hidden className="block text-xanh-300">
      <defs>
        <pattern id={id} width="24" height="24" patternUnits="userSpaceOnUse">
          <path d="M12 3 L21 12 L12 21 L3 12 Z" fill="none" stroke="currentColor" strokeWidth="0.8" />
          <circle cx="12" cy="12" r="1" fill="currentColor" />
        </pattern>
      </defs>
      <rect width="100%" height="24" fill={`url(#${id})`} />
    </svg>
  );
}

/** Chung chi (LMS — man "cert"): moi khoa trong lo trinh; da cap = the trang vien xanh, chua cap = khung net dut */
export function ManChungChi() {
  const { nguoiDung } = useXacThuc();
  const lo = useLoTrinh();
  const cc = useChungChi();

  const dangTai = lo.dangTai || cc.dangTai;
  const loi = (!lo.data && lo.loi) || (!cc.data && cc.loi) || null;

  const dsKhoa = (lo.data?.nhom ?? []).flatMap(n => n.khoa_hoc);
  const dsCc = (cc.data ?? []).filter(c => !c.thu_hoi_luc);
  const o: OChungChi[] = dsKhoa.map(k => ({ khoaId: k.id, ten: k.ten, khoa: k, cc: dsCc.find(c => c.khoa_hoc_id === k.id) ?? null }));
  // Chung chi cua khoa ngoai lo trinh hien tai (vd vai cu) van hien
  for (const c of dsCc) if (!o.some(x => x.khoaId === c.khoa_hoc_id)) o.push({ khoaId: c.khoa_hoc_id, ten: c.khoa_hoc_ten, khoa: null, cc: c });
  o.sort((a, b) => Number(!!b.cc) - Number(!!a.cc));

  return (
    <div className="flex flex-col">
      <TieuDeTrang tieuDe="Chứng chỉ" moTa="Chứng chỉ mở khóa vai trò tương ứng trên Thiên Khuê S." />

      {dangTai ? (
        <div className="grid gap-5 md:grid-cols-2">
          {[0, 1, 2, 3].map(i => (
            <KhungCho key={i} className="h-[220px]" />
          ))}
        </div>
      ) : loi ? (
        <Loi
          tieuDe="Không tải được chứng chỉ"
          chiTiet={loi}
          thuLai={() => {
            lo.taiLai();
            cc.taiLai();
          }}
        />
      ) : !o.length ? (
        <Trong tieuDe="Chưa có chứng chỉ" moTa="Hoàn thành khóa học trong lộ trình để nhận chứng chỉ." />
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {o.map(x => {
            const daCap = !!x.cc;
            return (
              <article
                key={x.khoaId}
                className={cn(
                  "flex min-h-[220px] min-w-0 flex-col gap-3 rounded-xl p-5 md:p-6",
                  daCap
                    ? "border border-chinh/30 bg-be-mat text-chu outline outline-1 -outline-offset-8 outline-xanh-200"
                    : "border border-dashed border-vien-dam bg-be-mat-phu text-chu-phu"
                )}
              >
                {daCap && <HoaVanLua />}
                <div className="flex items-center justify-between gap-3">
                  <div className={cn(lopKicker, daCap && "text-chinh-dam")}>{daCap ? "Đã cấp chứng chỉ" : "Chưa mở khóa"}</div>
                  <HinhThoi className={daCap ? "text-chinh" : "text-chu-mo"} />
                </div>
                <div className={cn(lopKicker, "tracking-[0.12em]")}>Học viện Thiên Khuê S chứng nhận</div>
                <div className={cn("break-words text-h1", daCap ? "text-chu" : "text-chu-phu")}>{x.ten}</div>
                <div className="text-sm">
                  {daCap
                    ? `Vai trò tương ứng đã được kích hoạt${x.cc!.diem != null ? ` · Điểm ${x.cc!.diem}%` : ""}.`
                    : x.khoa
                      ? `${goiYChungChi(x.khoa)} Đã học ${x.khoa.tien_do.so_bai_xong}/${x.khoa.tien_do.so_bai} bài.`
                      : "Hoàn thành khóa học để nhận chứng chỉ."}
                </div>
                {daCap && (
                  <div className="mt-auto flex flex-wrap justify-between gap-x-4 gap-y-1 border-t border-vien pt-3 text-xs text-chu-phu">
                    <span>Học viên: {nguoiDung?.ho_so.ho_ten ?? "—"}</span>
                    <span>Ngày cấp: {dinhDangNgay(x.cc!.cap_luc)}</span>
                    <span className="break-all font-mono">Mã: {x.cc!.ma_chung_chi}</span>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
