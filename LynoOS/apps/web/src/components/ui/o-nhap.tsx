import { forwardRef, useId } from "react";
import { cn } from "@/lib/cn";
import { lopNhanTruong, lopO } from "./lop";

/*
 * O nhap theo he trang xanh (CRM DESIGN.md "Inputs"): vien `vien-dam`, bo 8px, cao 44 (dien thoai) / 36 (tu sm),
 * focus vien `chinh` + vong nhat, loi vien `loi` + dong loi caption ngay duoi o.
 * ONhap (input), OChon (select), OVanBan (textarea) — deu co nhan, goi y, loi. Class goc: lopO trong ./lop.
 */

interface ChungTruong {
  nhan?: React.ReactNode;
  goiY?: React.ReactNode;
  loi?: string | null;
  /** Danh dau bat buoc (*) */
  batBuoc?: boolean;
  lopKhung?: string;
}

const LOP_O = lopO;

function KhungTruong({ id, nhan, goiY, loi, batBuoc, lopKhung, children }: ChungTruong & { id: string; children: React.ReactNode }) {
  return (
    <div className={cn("flex flex-col gap-2", lopKhung)}>
      {nhan && (
        <label htmlFor={id} className={lopNhanTruong}>
          {nhan}
          {batBuoc && <span className="text-loi"> *</span>}
        </label>
      )}
      {children}
      {loi ? (
        <p id={`${id}-loi`} role="alert" className="text-xs font-medium text-loi">
          {loi}
        </p>
      ) : goiY ? (
        <p id={`${id}-goi-y`} className="text-xs text-chu-mo">
          {goiY}
        </p>
      ) : null}
    </div>
  );
}

export interface ONhapProps extends React.InputHTMLAttributes<HTMLInputElement>, ChungTruong {}

export const ONhap = forwardRef<HTMLInputElement, ONhapProps>(function ONhap({ nhan, goiY, loi, batBuoc, lopKhung, className, id, ...con }, ref) {
  const tuDong = useId();
  const ma = id ?? tuDong;
  return (
    <KhungTruong id={ma} nhan={nhan} goiY={goiY} loi={loi} batBuoc={batBuoc} lopKhung={lopKhung}>
      <input
        ref={ref}
        id={ma}
        required={batBuoc}
        aria-invalid={loi ? true : undefined}
        aria-describedby={loi ? `${ma}-loi` : goiY ? `${ma}-goi-y` : undefined}
        className={cn(LOP_O, className)}
        {...con}
      />
    </KhungTruong>
  );
});

export interface OChonProps extends React.SelectHTMLAttributes<HTMLSelectElement>, ChungTruong {
  luaChon: { giaTri: string; nhan: string }[];
  /** Dong dau trong, vd "Chọn vai trò" */
  goiYChon?: string;
}

export const OChon = forwardRef<HTMLSelectElement, OChonProps>(function OChon(
  { nhan, goiY, loi, batBuoc, lopKhung, className, id, luaChon, goiYChon, ...con },
  ref
) {
  const tuDong = useId();
  const ma = id ?? tuDong;
  return (
    <KhungTruong id={ma} nhan={nhan} goiY={goiY} loi={loi} batBuoc={batBuoc} lopKhung={lopKhung}>
      <select ref={ref} id={ma} required={batBuoc} aria-invalid={loi ? true : undefined} className={cn(LOP_O, "cursor-pointer", className)} {...con}>
        {goiYChon !== undefined && <option value="">{goiYChon}</option>}
        {luaChon.map(l => (
          <option key={l.giaTri} value={l.giaTri}>
            {l.nhan}
          </option>
        ))}
      </select>
    </KhungTruong>
  );
});

export interface OVanBanProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement>, ChungTruong {}

export const OVanBan = forwardRef<HTMLTextAreaElement, OVanBanProps>(function OVanBan({ nhan, goiY, loi, batBuoc, lopKhung, className, id, rows = 4, ...con }, ref) {
  const tuDong = useId();
  const ma = id ?? tuDong;
  return (
    <KhungTruong id={ma} nhan={nhan} goiY={goiY} loi={loi} batBuoc={batBuoc} lopKhung={lopKhung}>
      <textarea ref={ref} id={ma} rows={rows} required={batBuoc} aria-invalid={loi ? true : undefined} className={cn(LOP_O, "py-2 leading-relaxed", className)} {...con} />
    </KhungTruong>
  );
});

/** O chon co vien (lua chon cau hoi trac nghiem / bo loc): dang chon vien `chinh`, nen `chinh-nhat` */
export function OLuaChon({ daChon, onClick, children, className, disabled }: { daChon?: boolean; onClick?: () => void; children: React.ReactNode; className?: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={daChon}
      className={cn(
        "min-h-11 rounded-lg border px-3 py-2 text-left text-sm transition-colors duration-nhanh disabled:cursor-not-allowed disabled:opacity-60",
        daChon ? "border-chinh bg-chinh-nhat font-semibold text-chinh-dam" : "border-vien-dam bg-be-mat text-chu hover:bg-be-mat-phu",
        className
      )}
    >
      {children}
    </button>
  );
}
