import { cn } from "@/lib/cn";
import { Trong } from "./trang-thai";

/*
 * Bang du lieu theo CRM DESIGN.md "Bang du lieu": khung bo 12 vien `vien`, dau bang nen `be-mat-phu` chu 12px/600 `chu-phu`,
 * dong cao >= 44px ke `vien`, re chuot nen `be-mat-phu`. So tabular (globals.css), cot so canPhai.
 * Tren mobile cuon ngang TRONG khung bang (trang khong cuon ngang).
 *
 *   <Bang cot={[{ khoa: "ten", tieuDe: "Họ tên" }, { khoa: "diem", tieuDe: "Điểm", canPhai: true, hienThi: r => `${r.diem}%` }]}
 *         dong={ds} khoaDong={r => r.id} />
 */

export interface CotBang<T> {
  khoa: string;
  tieuDe: React.ReactNode;
  hienThi?: (dong: T) => React.ReactNode;
  canPhai?: boolean;
  lop?: string;
}

export function Bang<T>({
  cot,
  dong,
  khoaDong,
  rong,
  onChonDong,
  className
}: {
  cot: CotBang<T>[];
  dong: T[];
  khoaDong: (d: T) => string;
  /** Noi dung khi khong co dong */
  rong?: React.ReactNode;
  onChonDong?: (d: T) => void;
  className?: string;
}) {
  if (!dong.length) return <>{rong ?? <Trong tieuDe="Chưa có dữ liệu" />}</>;
  return (
    <div className={cn("cuon-mong w-full overflow-x-auto rounded-xl border border-vien bg-be-mat", className)}>
      <table className="w-full min-w-[560px] border-collapse text-sm text-chu">
        <thead>
          <tr className="bg-be-mat-phu">
            {cot.map(c => (
              <th
                key={c.khoa}
                scope="col"
                className={cn("whitespace-nowrap px-4 py-2 text-xs font-semibold text-chu-phu", c.canPhai ? "text-right" : "text-left", c.lop)}
              >
                {c.tieuDe}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dong.map(d => (
            <tr
              key={khoaDong(d)}
              onClick={onChonDong ? () => onChonDong(d) : undefined}
              className={cn("border-t border-vien transition-colors duration-nhanh", onChonDong ? "cursor-pointer hover:bg-be-mat-phu" : "hover:bg-be-mat-phu/60")}
            >
              {cot.map(c => (
                <td key={c.khoa} className={cn("h-11 px-4 py-3 align-middle", c.canPhai && "text-right", c.lop)}>
                  {c.hienThi ? c.hienThi(d) : String((d as Record<string, unknown>)[c.khoa] ?? "—")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
