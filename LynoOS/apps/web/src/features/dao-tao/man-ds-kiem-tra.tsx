"use client";

import { KhungCho, Loi, lopKicker, lopThe, Nhan, NutLienKet, TieuDeTrang, Trong } from "@/components/ui";
import { cn } from "@/lib/cn";
import { useLoTrinh } from "./hooks";
import { Kicker } from "./thanh-phan";
import { nhanKhoa } from "./tinh-toan";

/** Danh sach bai kiem tra trong lo trinh cua toi (muc "Bài kiểm tra" o sidebar) */
export function ManDsKiemTra() {
  const { data, dangTai, loi, taiLai } = useLoTrinh();
  const ds = (data?.nhom ?? []).flatMap(n => n.khoa_hoc).filter(k => k.co_bai_kiem_tra);
  const chuaDat = ds.filter(k => !k.tien_do.kiem_tra_dat);
  const daDat = ds.filter(k => k.tien_do.kiem_tra_dat);

  return (
    <div className="flex flex-col gap-8 [&>header]:mb-0">
      <TieuDeTrang
        tieuDe="Bài kiểm tra"
        moTa="Bài kiểm tra bắt buộc đạt từ 90%. Đạt khóa sản phẩm mới được cấp quyền tư vấn, lấy mã giới thiệu và bán đúng mã đó."
      />

      {dangTai ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[0, 1, 2, 3].map(i => (
            <KhungCho key={i} className="h-[168px]" />
          ))}
        </div>
      ) : !data ? (
        <Loi tieuDe="Không tải được bài kiểm tra" chiTiet={loi} thuLai={taiLai} />
      ) : !ds.length ? (
        <Trong tieuDe="Chưa có bài kiểm tra" moTa="Bài kiểm tra của các khóa trong lộ trình sẽ hiện ở đây." />
      ) : (
        [
          { tieuDe: "Cần làm", ds: chuaDat },
          { tieuDe: "Đã đạt", ds: daDat }
        ]
          .filter(n => n.ds.length)
          .map(n => (
            <section key={n.tieuDe} className="flex flex-col gap-3">
              <h2 className="m-0 flex items-baseline gap-2 text-h2 text-chu">
                {n.tieuDe} <span className="text-sm font-medium text-chu-phu">{n.ds.length} bài</span>
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                {n.ds.map(k => {
                  const dat = k.tien_do.kiem_tra_dat;
                  const diem = k.tien_do.diem_cao_nhat;
                  const canLamLai = !dat && k.tien_do.trang_thai === "CAN_HOC_LAI";
                  return (
                    <div
                      key={k.id}
                      className={cn("flex flex-col gap-2 rounded-xl border p-4 md:p-5", dat ? "border-vien bg-be-mat" : "border-chinh/20 bg-chinh-nhat")}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={cn(lopKicker, !dat && "text-chinh-dam")}>
                          {nhanKhoa(k)}
                          {k.ma_mau ? ` · ${k.ma_mau}` : ""}
                        </span>
                        {dat && <Nhan tong="thanh-cong">Đã đạt</Nhan>}
                        {canLamLai && <Nhan tong="canh-bao">Cần làm lại</Nhan>}
                      </div>
                      <div className="text-h3 text-chu">{k.ten}</div>
                      <div className="text-sm text-chu-phu">
                        {dat
                          ? `Đã đạt${diem != null ? ` · ${diem}%` : ""}.`
                          : canLamLai
                            ? "Tài liệu vừa cập nhật — cần làm lại."
                            : diem != null
                              ? `Chưa đạt — cao nhất ${diem}%, có thể làm lại.`
                              : "Chưa làm · Cần đúng từ 90%."}
                        {k.tien_do.so_bai_xong < k.tien_do.so_bai && !dat ? ` Đã học ${k.tien_do.so_bai_xong}/${k.tien_do.so_bai} bài.` : ""}
                      </div>
                      <NutLienKet href={`/hoc-vien/bai-kiem-tra/${k.id}`} kieu={dat ? "vien" : "chinh"} co="nho" className="mt-1 self-start">
                        {dat ? "Xem lại" : "Làm bài"}
                      </NutLienKet>
                    </div>
                  );
                })}
              </div>
            </section>
          ))
      )}
      {data && ds.length > 0 && (
        <div className={cn(lopThe, "bg-be-mat-phu p-4 md:p-5")}>
          <Kicker>Lưu ý</Kicker>
          <p className="m-0 mt-2 text-sm text-chu-phu">
            Đáp án chỉ hiện sau khi bạn đạt. Mỗi lần nộp đều được lưu làm bằng chứng (điểm, thời điểm, phiên bản tài liệu).
          </p>
        </div>
      )}
    </div>
  );
}
