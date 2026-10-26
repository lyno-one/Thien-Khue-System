"use client";

import Link from "next/link";
import { KhungCho, Loi, lopLienKet, lopThe, Nhan, NutLienKet, TieuDeTrang, Trong } from "@/components/ui";
import { cn } from "@/lib/cn";
import { useXacThuc } from "@/providers/auth-provider";
import { useLoTrinhBaiLyno } from "./hooks";
import type { BaiLynoTrongLoTrinh, LoTrinhBaiLyno } from "./kieu";
import { DauBai, Kicker, ThanhTienDo } from "./thanh-phan";
import { phanTram } from "./tinh-toan";

/*
 * Bai hoc Lyno — bai do Lyno soan tren CRM (/kb cua CRM), doc song qua API Thien Khue -> CRM.
 * CRM chon bai theo vi tri va tinh tien do; KHONG tinh vao kich hoat vai cua Thien Khue.
 */

/** Trang thai mot bai: Da xong / Chua dat quiz (diem cao nhat) / Chua hoc */
export function trangThaiBaiLyno(b: BaiLynoTrongLoTrinh): { nhan: string; tong: "thanh-cong" | "canh-bao" | "trung-tinh" } {
  if (b.daXong) return { nhan: b.coQuiz && b.diem != null ? `Đã xong · ${b.diem}%` : "Đã xong", tong: "thanh-cong" };
  if (b.coQuiz && b.diem != null) return { nhan: `Chưa đạt bài kiểm tra · cao nhất ${b.diem}%`, tong: "canh-bao" };
  return { nhan: "Chưa học", tong: "trung-tinh" };
}

/** Thong bao than thien cho nguoi khong phai nhan su Lyno */
export function KhongPhaiNhanSuLyno() {
  return (
    <Trong
      tieuDe="Bài học Lyno dành cho nhân sự Lyno"
      moTa="Mục này hiện bài học Lyno soạn trên CRM cho nhân sự có tài khoản CRM. Tài khoản của bạn chưa gắn với nhân sự Lyno."
      hanhDong={
        <NutLienKet href="/hoc-vien/khoa-hoc" kieu="vien" co="nho">
          Xem khóa học Thiên Khuê
        </NutLienKet>
      }
    />
  );
}

function TomTatTienDo({ lo }: { lo: LoTrinhBaiLyno }) {
  const pt = phanTram(lo.xongBatBuoc, lo.tongBatBuoc);
  return (
    <div className={cn(lopThe, "flex flex-col gap-3 p-4 md:p-5")}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Kicker>Tiến độ bắt buộc</Kicker>
        {lo.viTri && <Nhan tong="trung-tinh">Vị trí: {lo.viTri}</Nhan>}
      </div>
      {lo.tongBatBuoc > 0 ? (
        <>
          <div className="text-h3 text-chu">
            Xong <span className="so">{lo.xongBatBuoc}/{lo.tongBatBuoc}</span> bài bắt buộc
          </div>
          <ThanhTienDo phanTram={pt} nhan="Tiến độ bài học Lyno bắt buộc" />
        </>
      ) : (
        <div className="text-sm text-chu-phu">Vị trí của bạn chưa có bài bắt buộc.</div>
      )}
    </div>
  );
}

/** Danh sach bai hoc Lyno (/hoc-vien/bai-hoc-lyno) */
export function ManBaiLyno() {
  const { nguoiDung } = useXacThuc();
  const laNhanSu = !!nguoiDung?.ho_so.crm_user_id;
  const { data, dangTai, loi, taiLai } = useLoTrinhBaiLyno(laNhanSu);

  const dau = <TieuDeTrang tieuDe="Bài học Lyno" moTa="Bài học Lyno soạn trên CRM theo vị trí của bạn. Tiến độ lưu ở CRM." />;

  if (!laNhanSu || data === null) {
    return (
      <div className="flex flex-col">
        {dau}
        <KhongPhaiNhanSuLyno />
      </div>
    );
  }

  const ds = [...(data?.baiHoc ?? [])].sort((a, b) => a.thu_tu - b.thu_tu);

  return (
    <div className="flex flex-col gap-6">
      {dau}
      {dangTai ? (
        <div className="flex flex-col gap-3">
          <KhungCho className="h-[120px]" />
          <KhungCho className="h-[72px]" />
          <KhungCho className="h-[72px]" />
        </div>
      ) : !data ? (
        <Loi tieuDe="Không tải được bài học Lyno" chiTiet={loi} thuLai={taiLai} />
      ) : (
        <>
          <TomTatTienDo lo={data} />
          {!ds.length ? (
            <Trong tieuDe="Chưa có bài học" moTa="Bài học Lyno dành cho vị trí của bạn sẽ hiện ở đây." />
          ) : (
            <ul className="m-0 flex list-none flex-col gap-3 p-0">
              {ds.map((b, i) => {
                const tt = trangThaiBaiLyno(b);
                return (
                  <li key={b.id} className={cn(lopThe, "tk-lift flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4 md:p-5")}>
                    <DauBai xong={b.daXong} />
                    <div className="flex min-w-0 flex-grow flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="so text-xs text-chu-mo">{String(i + 1).padStart(2, "0")}</span>
                        <Link href={`/hoc-vien/bai-hoc-lyno/${b.id}`} className="min-w-0 text-h4 text-chu no-underline hover:text-chinh-dam">
                          {b.tieu_de}
                        </Link>
                        {b.bat_buoc && <Nhan tong="chinh">Bắt buộc</Nhan>}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-chu-phu">
                        <Nhan tong={tt.tong}>{tt.nhan}</Nhan>
                        {b.video_url && <span>Có video</span>}
                        {b.coQuiz && <span>· Có bài kiểm tra</span>}
                      </div>
                    </div>
                    <NutLienKet href={`/hoc-vien/bai-hoc-lyno/${b.id}`} kieu={b.daXong ? "vien" : "chinh"} co="nho" className="shrink-0 self-start sm:self-auto">
                      {b.daXong ? "Xem lại" : "Học ngay"}
                    </NutLienKet>
                  </li>
                );
              })}
            </ul>
          )}
          {loi && <p className="m-0 text-xs text-chu-mo">Không làm mới được: {loi}</p>}
        </>
      )}
    </div>
  );
}

/** The nho tren trang tong quan hoc vien: an han voi nguoi khong phai nhan su Lyno / dang tai / loi */
export function TheBaiLyno() {
  const { nguoiDung } = useXacThuc();
  const laNhanSu = !!nguoiDung?.ho_so.crm_user_id;
  const { data } = useLoTrinhBaiLyno(laNhanSu);
  if (!laNhanSu || !data) return null;
  const pt = phanTram(data.xongBatBuoc, data.tongBatBuoc);
  return (
    <div className={cn(lopThe, "flex flex-col gap-2 p-4 md:p-5")}>
      <Kicker>Bài học Lyno</Kicker>
      <div className="text-h4 text-chu">
        {data.tongBatBuoc > 0 ? (
          <>
            Xong <span className="so">{data.xongBatBuoc}/{data.tongBatBuoc}</span> bài bắt buộc
          </>
        ) : (
          `${data.baiHoc.length} bài học`
        )}
      </div>
      {data.tongBatBuoc > 0 && <ThanhTienDo phanTram={pt} nhan="Tiến độ bài học Lyno bắt buộc" />}
      <div className="text-xs text-chu-mo">Bài học soạn trên CRM — không tính vào kích hoạt vai trò Thiên Khuê.</div>
      <Link href="/hoc-vien/bai-hoc-lyno" className={cn(lopLienKet, "self-start text-sm")}>
        Học bài Lyno →
      </Link>
    </div>
  );
}
