/**
 * Class dung chung cho dieu khien co ban — chep tu CRM Lyno (apps/web/src/components/ui/lop.ts, DESIGN.md):
 * token ngu nghia, luoi 4px, bo 4 · 8 · 12. Chuoi class thay vi component de gan len <button>, <a>, <Link>, <input>... san co.
 * Khac CRM co chu dich: nut / o nhap cao 44px tren dien thoai (duoi sm), 36px tu sm — vung cham ngon tay cho trang cong khai.
 *
 *   lopNutChinh  nut chinh cua vung              lopNutPhu   nut phu / Huy / Quay lai
 *   lopNutNguy   nut dong y thao tac pha huy     lopNutVien  nut vien nho trong dong bang (cao 28)
 *   lopNutIcon   nut chi co icon (36 / 32)       lopNutVuong nut icon co vien, canh nut phu
 *   lopNutMa     nut khong nen (ghost)           lopLienKet  link chu trong doan van
 *   lopO         o nhap / select / textarea      lopNhanTruong nhan tren o nhap
 *   lopThe       the (bo 12, vien, nen trang)    lopKhungDs / lopHangNhan / lopDongBam / lopTrong  danh sach ke dong
 *   lopThanhTab + lopTab  bo loc dang tab        lopChip + lopChipTong  nhan trang thai
 *   lopKicker    dong nho in hoa tren tieu de    lopNhomNav  nhan nhom menu ("HỌC TẬP")
 */

export const lopNutGoc =
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold no-underline " +
  "transition-colors duration-nhanh disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50";

/** Cao chuan cua nut: 44px tren dien thoai, 36px tu sm */
export const lopCaoNut = "h-11 sm:h-9";

export const lopNutChinh = `${lopNutGoc} ${lopCaoNut} bg-chinh px-4 text-tren-chinh hover:bg-chinh-dam hover:text-tren-chinh`;

export const lopNutPhu = `${lopNutGoc} ${lopCaoNut} border border-vien-dam bg-be-mat px-4 text-chu hover:bg-be-mat-phu`;

export const lopNutNguy = `${lopNutGoc} ${lopCaoNut} bg-loi px-4 text-tren-chinh hover:bg-loi/90`;

export const lopNutMa = `${lopNutGoc} ${lopCaoNut} bg-transparent px-3 text-chu-phu hover:bg-be-mat-phu hover:text-chu`;

export const lopNutVien =
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-1 whitespace-nowrap rounded border border-vien-dam bg-be-mat " +
  "h-7 px-2 text-xs font-medium text-chinh no-underline transition-colors duration-nhanh hover:border-chinh/40 hover:bg-chinh-nhat " +
  "disabled:cursor-not-allowed disabled:opacity-50";

export const lopNutIcon =
  "inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-lg text-chu-phu sm:h-9 sm:w-9 " +
  "transition-colors duration-nhanh hover:bg-be-mat-phu hover:text-chu";

export const lopNutVuong = `${lopNutGoc} h-11 w-11 sm:h-9 sm:w-9 border border-vien-dam bg-be-mat text-chu-phu hover:bg-be-mat-phu hover:text-chu`;

/** Link chu trong doan van / dong bang */
export const lopLienKet = "font-medium text-chinh underline-offset-2 hover:text-chinh-dam hover:underline";

/** O nhap: input / select cao 44 (dien thoai) / 36 (tu sm); textarea tu cao. Chu 16px tren dien thoai de iOS khong phong to */
export const lopO =
  "w-full rounded-lg border border-vien-dam bg-be-mat px-3 py-2 text-base text-chu placeholder:text-chu-mo sm:text-sm " +
  "[&:not(textarea)]:h-11 sm:[&:not(textarea)]:h-9 " +
  "transition-colors duration-nhanh focus:border-chinh focus:outline-none focus:ring-2 focus:ring-chinh/20 " +
  "aria-[invalid=true]:border-loi disabled:cursor-not-allowed disabled:bg-be-mat-phu disabled:text-chu-mo";

export const lopNhanTruong = "text-sm font-semibold text-chu";

/** The: bo lon 12, vien `vien`, nen trang, khong bong khi o yen */
export const lopThe = "rounded-xl border border-vien bg-be-mat";

/** Danh sach ke dong (DESIGN.md "Bang du lieu") */
export const lopKhungDs = "overflow-hidden rounded-xl border border-vien bg-be-mat divide-y divide-vien";

export const lopHangNhan = "hidden bg-be-mat-phu px-4 py-2 text-xs font-semibold text-chu-phu";

export const lopDongBam =
  "cursor-pointer px-4 py-3 transition-colors duration-nhanh hover:bg-be-mat-phu focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-vong";

export const lopTrong = "rounded-xl border border-vien bg-be-mat px-4 py-6 text-center text-sm text-chu-mo";

export const lopThanhTab = "inline-flex max-w-full flex-wrap gap-1 rounded-lg bg-be-mat-phu p-1";

export const lopTab = (dangChon: boolean) =>
  "inline-flex h-9 sm:h-8 items-center gap-2 whitespace-nowrap rounded px-3 text-sm no-underline transition-colors duration-nhanh " +
  (dangChon ? "bg-be-mat font-semibold text-chinh-dam ring-1 ring-vien" : "text-chu-phu hover:bg-be-mat/60 hover:text-chu");

/** Nhan trang thai (chip): caption, bo nho — mau lay tu lopChipTong */
export const lopChip = "inline-flex items-center gap-1 whitespace-nowrap rounded px-2 py-0.5 text-xs font-medium";

export type TongChip = "chinh" | "trung-tinh" | "thanh-cong" | "canh-bao" | "loi" | "dam";

export const lopChipTong: Record<TongChip, string> = {
  chinh: "bg-chinh-nhat text-chinh-dam",
  "trung-tinh": "bg-be-mat-phu text-chu-phu",
  "thanh-cong": "bg-thanh-cong-nhat text-thanh-cong",
  "canh-bao": "bg-canh-bao-nhat text-canh-bao",
  loi: "bg-loi-nhat text-loi",
  dam: "bg-chinh text-tren-chinh"
};

/** Dong nho in hoa tren tieu de (kicker) */
export const lopKicker = "text-xs font-semibold uppercase tracking-[0.04em] text-chu-mo";

/** Nhan nhom menu sidebar */
export const lopNhomNav = "px-3 text-xs font-medium uppercase tracking-[0.04em] text-chu-mo";
