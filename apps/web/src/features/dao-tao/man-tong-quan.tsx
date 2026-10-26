"use client";

import { NHAN_VAI } from "@thien-khue/contracts";
import Link from "next/link";
import { DangTai, KhungCho, Loi, lopChip, lopKicker, lopLienKet, lopThe, Nhan, NutLienKet, Trong } from "@/components/ui";
import { cn } from "@/lib/cn";
import { useXacThuc } from "@/providers/auth-provider";
import { useLoTrinh, useQuyenSku } from "./hooks";
import { TheBaiLyno } from "./man-bai-lyno";
import { DauBai, Kicker, OSoLieu, ThanhTienDo } from "./thanh-phan";
import { huyHieu, nhanKhoa, nhanNutKhoa } from "./tinh-toan";

/** Tong quan hoc vien (LMS — man "dash"): lo trinh theo vai cua toi */
export function ManTongQuan() {
  const { nguoiDung, coVai } = useXacThuc();
  const loTrinh = useLoTrinh();
  const quyen = useQuyenSku();

  if (loTrinh.dangTai) {
    return (
      <div className="flex flex-col gap-8">
        <KhungCho className="h-[220px]" />
        <div className="grid gap-4 sm:grid-cols-3">
          <KhungCho className="h-[108px]" />
          <KhungCho className="h-[108px]" />
          <KhungCho className="h-[108px]" />
        </div>
        <DangTai chu="Đang tải lộ trình học…" />
      </div>
    );
  }
  const lo = loTrinh.data;
  if (!lo) return <Loi tieuDe="Không tải được lộ trình học" chiTiet={loTrinh.loi} thuLai={loTrinh.taiLai} />;

  const ds = lo.nhom.flatMap(n => n.khoa_hoc);
  if (!ds.length) {
    return (
      <div className="flex flex-col gap-6">
        <Trong
          tieuDe="Chưa có khóa học cho vai trò của bạn"
          moTa="Khi bạn được gán vai trò Sale, CSKH, CTV, Thực tập sinh hoặc KOL/KOC, lộ trình học sẽ hiện ở đây."
          hanhDong={
            <NutLienKet href="/hoc-vien/khoa-hoc" kieu="vien" co="nho">
              Xem tất cả khóa học
            </NutLienKet>
          }
        />
        <TheBaiLyno />
      </div>
    );
  }

  const t = lo.tong;
  const tiep = lo.bai_tiep_theo;
  const hh = huyHieu(ds, t.so_chung_chi);
  const nhieuNhom = lo.nhom.filter(x => x.khoa_hoc.length).length > 1;

  // Viec can lam: bai kiem tra chua dat — uu tien khoa bat buoc, roi theo thu tu lo trinh
  const coKiemTra = ds.filter(k => k.co_bai_kiem_tra);
  const ktChuaDat = coKiemTra.filter(k => !k.tien_do.kiem_tra_dat).sort((a, b) => Number(b.bat_buoc) - Number(a.bat_buoc))[0];
  const vaiDangHoc = lo.vai.filter(v => v.trang_thai === "DANG_HOC");
  const canHocLai = (quyen.data ?? []).filter(q => q.trang_thai === "CAN_HOC_LAI");
  const thucHanhChuaDat = ds.filter(k => k.can_thuc_hanh && k.tien_do.thuc_hanh === "CHUA_DAT");
  const laMentor = coVai("MENTOR", "QUAN_LY");

  return (
    <div className="flex flex-col gap-8">
      {/* HERO — nen chinh-nhat phang, chu muc (bo nen cobalt + dai vang) */}
      <section className="tk-up relative grid gap-6 overflow-hidden rounded-xl border border-vien bg-chinh-nhat px-4 py-6 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] md:items-center md:px-8 md:py-8">
        <svg
          viewBox="0 0 400 220"
          width="400"
          height="220"
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-6 max-w-none text-xanh-100"
        >
          <path d="M-10 170 C 80 60, 160 220, 250 110 S 380 40, 420 90" fill="none" stroke="currentColor" strokeWidth="24" strokeLinecap="round" />
          <path d="M20 40 L40 60 L20 80 L0 60 Z" fill="none" stroke="currentColor" strokeWidth="2" className="text-xanh-200" />
        </svg>
        <div className="relative flex min-w-0 flex-col gap-3">
          <span className={lopKicker}>Tiếp tục hành trình</span>
          <h1 className="m-0 text-h1 text-chu">
            Hôm nay học gì, <span className="text-chinh-dam">mai tỏa sáng</span> điều đó.
          </h1>
          {tiep ? (
            <>
              <p className="m-0 text-sm text-chu-phu">
                Bài tiếp theo: <strong className="font-semibold text-chu">{tiep.tieu_de}</strong> · {tiep.khoa_hoc_ten}
              </p>
              <NutLienKet href={`/hoc-vien/khoa-hoc/${tiep.khoa_hoc_id}?bai=${tiep.bai_hoc_id}`} co="lon" className="self-start">
                Học ngay →
              </NutLienKet>
            </>
          ) : (
            <p className="m-0 text-sm text-chu-phu">Bạn đã học hết các bài trong lộ trình — ôn lại hoặc hoàn thành bài kiểm tra còn thiếu.</p>
          )}
          {nguoiDung && !nguoiDung.ho_so.kich_hoat_lam_viec && (
            <p className="m-0 text-xs text-chu-phu">Hoàn thành khóa bắt buộc, đạt bài kiểm tra từ 90% để kích hoạt vai trò làm việc.</p>
          )}
        </div>
        <div className="relative flex min-w-0 flex-col gap-2 md:items-end">
          <span className={lopKicker}>Huy hiệu</span>
          <ul className="m-0 flex list-none flex-wrap gap-2 p-0 md:justify-end">
            {hh.map(h => (
              <li
                key={h.nhan}
                className={cn(lopChip, "py-1", h.co ? "bg-chinh text-tren-chinh" : "border border-dashed border-vien-dam bg-be-mat text-chu-mo")}
              >
                {h.co ? "★ " : ""}
                {h.nhan}
                <span className="sr-only">{h.co ? " — đã đạt" : " — chưa đạt"}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* SO LIEU */}
      <div className="grid gap-4 sm:grid-cols-3">
        <OSoLieu nhan="Bài học đã hoàn thành" giaTri={`${t.so_bai_xong}/${t.so_bai}`} />
        <OSoLieu nhan="Khóa học đang theo" giaTri={t.so_khoa_da_bat_dau} />
        <OSoLieu nhan="Chứng chỉ đã nhận" giaTri={t.so_chung_chi} />
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        {/* KHOA HOC CUA BAN — theo nhom lo trinh */}
        <section className="flex min-w-0 flex-col gap-3">
          <h2 className="m-0 text-h2 text-chu">Khóa học của bạn</h2>
          {lo.nhom
            .filter(n => n.khoa_hoc.length)
            .map(n => (
              <div key={n.loai} className="flex flex-col gap-3">
                {nhieuNhom && <div className={cn(lopKicker, "pt-2")}>{n.tieu_de}</div>}
                {n.khoa_hoc.map(k => (
                  <div key={k.id} className={cn(lopThe, "tk-lift flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:gap-5 md:p-5")}>
                    <div className="flex min-w-0 flex-grow flex-col gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="min-w-0 text-h3 text-chu">{k.ten}</span>
                        <Nhan tong="trung-tinh">{nhanKhoa(k)}</Nhan>
                        {k.tien_do.trang_thai === "HOAN_THANH" && <Nhan tong="thanh-cong">Hoàn thành</Nhan>}
                        {k.tien_do.trang_thai === "CAN_HOC_LAI" && <Nhan tong="canh-bao">Cần học lại</Nhan>}
                      </div>
                      <ThanhTienDo phanTram={k.tien_do.phan_tram} nhan={`Tiến độ ${k.ten}`} />
                      <div className="text-xs text-chu-phu">
                        <span className="so">{k.tien_do.phan_tram}%</span> hoàn thành · {k.tien_do.so_bai} bài học
                      </div>
                    </div>
                    <NutLienKet href={`/hoc-vien/khoa-hoc/${k.id}`} kieu="vien" className="shrink-0 self-start sm:self-auto">
                      {nhanNutKhoa(k)}
                    </NutLienKet>
                  </div>
                ))}
              </div>
            ))}
        </section>

        {/* VIEC CAN LAM */}
        <section className="flex min-w-0 flex-col gap-3">
          <h2 className="m-0 text-h2 text-chu">Việc cần làm</h2>
          <div className="flex flex-col gap-2 rounded-xl border border-chinh/20 bg-chinh-nhat p-4 md:p-5">
            <div className={cn(lopKicker, "text-chinh-dam")}>Bài kiểm tra</div>
            {ktChuaDat ? (
              <>
                <div className="text-h3 text-chu">{ktChuaDat.ten}</div>
                <div className="text-sm text-chu-phu">
                  {ktChuaDat.tien_do.diem_cao_nhat != null
                    ? `Chưa đạt — cao nhất ${ktChuaDat.tien_do.diem_cao_nhat}%, có thể làm lại.`
                    : "Chưa làm · Cần đúng từ 90%."}
                </div>
                <NutLienKet href={`/hoc-vien/bai-kiem-tra/${ktChuaDat.id}`} co="nho" className="mt-1 self-start">
                  Làm bài
                </NutLienKet>
              </>
            ) : (
              <div className="text-sm text-chu-phu">{coKiemTra.length ? "Bạn đã đạt tất cả bài kiểm tra." : "Chưa có bài kiểm tra."}</div>
            )}
          </div>

          {vaiDangHoc.map(v => (
            <div key={v.vai} className={cn(lopThe, "flex flex-col gap-2 p-4 md:p-5")}>
              <Kicker>Kích hoạt vai trò {NHAN_VAI[v.vai]}</Kicker>
              <div className="text-sm text-chu-phu">
                {v.du_dieu_kien ? "Đã đủ điều kiện — vai trò sẽ được kích hoạt." : "Hoàn thành các khóa bắt buộc dưới đây:"}
              </div>
              <ul className="m-0 flex list-none flex-col p-0">
                {v.khoa_bat_buoc.map(k => (
                  <li key={k.id}>
                    <Link
                      href={`/hoc-vien/khoa-hoc/${k.id}`}
                      className="-mx-2 flex min-h-10 items-center gap-2 rounded-lg px-2 text-sm text-chu no-underline transition-colors duration-nhanh hover:bg-be-mat-phu hover:text-chinh-dam"
                    >
                      <DauBai xong={k.hoan_thanh} />
                      <span>{k.ten}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {canHocLai.length > 0 && (
            <div role="status" className="flex flex-col gap-2 rounded-xl border border-canh-bao/30 bg-canh-bao-nhat p-4 text-canh-bao md:p-5">
              <div className="text-xs font-semibold uppercase tracking-[0.04em]">Cần học lại</div>
              <div className="text-sm">
                Tài liệu của {canHocLai.map(q => q.ma_mau).join(", ")} vừa cập nhật — tạm dừng bán tới khi bạn xác nhận hoặc học lại.
              </div>
              <Link href="/hoc-vien/quyen-sku" className="self-start text-sm font-semibold text-canh-bao underline underline-offset-2">
                Xem quyền SKU →
              </Link>
            </div>
          )}

          {thucHanhChuaDat.length > 0 && (
            <div className={cn(lopThe, "flex flex-col gap-2 p-4 md:p-5")}>
              <Kicker>Bài thực hành</Kicker>
              <div className="text-sm text-chu-phu">Bài thực hành chưa đạt — xem nhận xét của mentor và nộp lại.</div>
              {thucHanhChuaDat.map(k => (
                <Link key={k.id} href={`/hoc-vien/khoa-hoc/${k.id}#thuc-hanh`} className={cn(lopLienKet, "self-start text-sm")}>
                  {k.ten} →
                </Link>
              ))}
            </div>
          )}

          {/* Bai hoc Lyno (CRM) — chi nhan su Lyno; doc lap voi kich hoat vai Thien Khue */}
          <TheBaiLyno />

          <div className={cn(lopThe, "flex flex-col gap-2 p-4 md:p-5")}>
            <Kicker>Quyền bán theo SKU</Kicker>
            <div className="text-h4 text-chu">Mã nào bạn được bán?</div>
            <div className="text-sm text-chu-phu">
              {quyen.data
                ? `${quyen.data.filter(q => q.trang_thai === "HOAT_DONG").length} mã đang được bán${canHocLai.length ? `, ${canHocLai.length} mã cần học lại` : ""}.`
                : "Học và đạt khóa sản phẩm để được cấp quyền từng mã."}
            </div>
            <Link href="/hoc-vien/quyen-sku" className={cn(lopLienKet, "self-start text-sm")}>
              Quyền SKU của tôi →
            </Link>
          </div>

          <div className={cn(lopThe, "flex flex-col gap-2 p-4 md:p-5")}>
            <Kicker>Buổi học trực tiếp</Kicker>
            <div className="text-h4 text-chu">Thực hành tư vấn &amp; phối khăn lụa</div>
            <div className="text-sm text-chu-phu">140A Lê Văn Sỹ, Phú Nhuận</div>
            <div className="text-xs text-chu-mo">Lịch buổi tới do mentor thông báo.</div>
          </div>

          {laMentor && (
            <div className={cn(lopThe, "flex flex-col gap-2 p-4 md:p-5")}>
              <Kicker>Mentor</Kicker>
              <div className="text-sm text-chu-phu">Chấm bài thực hành của học viên để mở khóa vai trò.</div>
              <Link href="/hoc-vien/cham-bai" className={cn(lopLienKet, "self-start text-sm")}>
                Chấm bài thực hành →
              </Link>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
