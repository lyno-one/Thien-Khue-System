import { forwardRef, useId } from "react";
import { lopNhanTruong, lopO } from "@/components/ui";
import { cn } from "@/lib/cn";

/*
 * O nhap cua form dang ky. Ten giu tu ban "gach chan" cu (Main.dc.html) de khong doi API;
 * kieu nay theo CRM DESIGN.md "Inputs": nhan 14px/600 chu, o vien vien-dam bo 8px, focus vien chinh + vong, loi vien loi + dong caption loi.
 */

const LOP_NHAN = cn(lopNhanTruong, "flex flex-col gap-2");
const LOP_O = cn(lopO, "font-normal");

function DongLoi({ id, loi }: { id: string; loi?: string | null }) {
  if (!loi) return null;
  return (
    <span id={id} role="alert" className="text-xs font-medium text-loi">
      {loi}
    </span>
  );
}

type ChungTruong = { nhan: React.ReactNode; loi?: string | null; batBuoc?: boolean };

export const OGach = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & ChungTruong>(function OGach(
  { nhan, loi, batBuoc, className, id, ...con },
  ref
) {
  const tuDong = useId();
  const ma = id ?? tuDong;
  return (
    <label htmlFor={ma} className={LOP_NHAN}>
      <span>
        {nhan}
        {batBuoc && <span className="text-loi"> *</span>}
      </span>
      <input
        ref={ref}
        id={ma}
        required={batBuoc}
        aria-invalid={loi ? true : undefined}
        aria-describedby={loi ? `${ma}-loi` : undefined}
        className={cn(LOP_O, className)}
        {...con}
      />
      <DongLoi id={`${ma}-loi`} loi={loi} />
    </label>
  );
});

export function ChonGach({
  nhan,
  luaChon,
  className,
  id,
  ...con
}: React.SelectHTMLAttributes<HTMLSelectElement> & { nhan: React.ReactNode; luaChon: string[] }) {
  const tuDong = useId();
  const ma = id ?? tuDong;
  return (
    <label htmlFor={ma} className={LOP_NHAN}>
      {nhan}
      <select id={ma} className={cn(LOP_O, "cursor-pointer", className)} {...con}>
        {luaChon.map(l => (
          <option key={l} value={l}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}

export function VanBanGach({ nhan, className, id, rows = 3, ...con }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { nhan: React.ReactNode }) {
  const tuDong = useId();
  const ma = id ?? tuDong;
  return (
    <label htmlFor={ma} className={LOP_NHAN}>
      {nhan}
      <textarea id={ma} rows={rows} className={cn(LOP_O, "resize-y py-2", className)} {...con} />
    </label>
  );
}
