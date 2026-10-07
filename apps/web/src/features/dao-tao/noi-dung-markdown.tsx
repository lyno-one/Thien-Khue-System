import { Fragment } from "react";
import { lopLienKet } from "@/components/ui";
import { cn } from "@/lib/cn";

/*
 * Hien noi dung bai hoc (Markdown) thanh React — KHONG dung dangerouslySetInnerHTML (noi dung do quan tri nhap).
 * Ho tro du cho bai hoc: tieu de #..###, doan van, danh sach - / 1., **dam**, *nghieng*, `ma`, [lien ket](https://...), > trich dan.
 */

type Khoi =
  | { kieu: "tieu-de"; cap: number; chu: string }
  | { kieu: "doan"; chu: string }
  | { kieu: "ds"; coSo: boolean; muc: string[] }
  | { kieu: "trich"; chu: string };

function tachKhoi(md: string): Khoi[] {
  const kq: Khoi[] = [];
  const dong = md.replace(/\r\n/g, "\n").split("\n");
  let doan: string[] = [];
  const dongDoan = () => {
    if (doan.length) kq.push({ kieu: "doan", chu: doan.join(" ") });
    doan = [];
  };
  for (const d0 of dong) {
    const d = d0.trim();
    if (!d) {
      dongDoan();
      continue;
    }
    const td = /^(#{1,6})\s+(.*)$/.exec(d);
    if (td) {
      dongDoan();
      kq.push({ kieu: "tieu-de", cap: td[1]!.length, chu: td[2]! });
      continue;
    }
    const ul = /^[-*+]\s+(.*)$/.exec(d);
    const ol = /^\d+[.)]\s+(.*)$/.exec(d);
    if (ul || ol) {
      dongDoan();
      const coSo = !!ol;
      const cuoi = kq[kq.length - 1];
      const chu = (ul ?? ol)![1]!;
      if (cuoi?.kieu === "ds" && cuoi.coSo === coSo) cuoi.muc.push(chu);
      else kq.push({ kieu: "ds", coSo, muc: [chu] });
      continue;
    }
    if (d.startsWith(">")) {
      dongDoan();
      const cuoi = kq[kq.length - 1];
      const chu = d.replace(/^>\s?/, "");
      if (cuoi?.kieu === "trich") cuoi.chu += ` ${chu}`;
      else kq.push({ kieu: "trich", chu });
      continue;
    }
    doan.push(d);
  }
  dongDoan();
  return kq;
}

/** Dinh dang trong dong: **dam**, *nghieng*, `ma`, [chu](https://url) */
function trongDong(chu: string): React.ReactNode[] {
  const kq: React.ReactNode[] = [];
  const re = /(\*\*([^*]+)\*\*)|(`([^`]+)`)|(\[([^\]]+)\]\((https?:\/\/[^)\s]+)\))|(\*([^*]+)\*)|(_([^_]+)_)/g;
  let viTri = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(chu))) {
    if (m.index > viTri) kq.push(chu.slice(viTri, m.index));
    if (m[2]) kq.push(<strong key={i++}>{m[2]}</strong>);
    else if (m[4]) kq.push(<code key={i++} className="rounded bg-be-mat-phu px-1 font-mono text-[0.875em] text-chu">{m[4]}</code>);
    else if (m[6] && m[7])
      kq.push(
        <a key={i++} href={m[7]} target="_blank" rel="noopener noreferrer" className={cn(lopLienKet, "underline")}>
          {m[6]}
        </a>
      );
    else if (m[9]) kq.push(<em key={i++}>{m[9]}</em>);
    else if (m[11]) kq.push(<em key={i++}>{m[11]}</em>);
    viTri = m.index + m[0].length;
  }
  if (viTri < chu.length) kq.push(chu.slice(viTri));
  return kq;
}

export function NoiDungMarkdown({ md, className }: { md: string; className?: string }) {
  const khoi = tachKhoi(md);
  return (
    <div className={cn("flex max-w-[70ch] flex-col gap-3 break-words text-body-lg text-chu", className)}>
      {khoi.map((k, i) => {
        if (k.kieu === "tieu-de") {
          const lop = k.cap <= 2 ? "text-h2" : "text-h3";
          return (
            <h3 key={i} className={cn("m-0 mt-2 text-chu", lop)}>
              {trongDong(k.chu)}
            </h3>
          );
        }
        if (k.kieu === "ds") {
          const The = k.coSo ? "ol" : "ul";
          return (
            <The key={i} className={cn("m-0 flex flex-col gap-1 pl-5", k.coSo ? "list-decimal" : "list-disc")}>
              {k.muc.map((m, j) => (
                <li key={j}>{trongDong(m)}</li>
              ))}
            </The>
          );
        }
        if (k.kieu === "trich") {
          return (
            <blockquote key={i} className="m-0 rounded-lg bg-be-mat-phu px-4 py-3 text-chu-phu">
              {trongDong(k.chu)}
            </blockquote>
          );
        }
        return (
          <p key={i} className="m-0">
            {trongDong(k.chu).map((n, j) => (
              <Fragment key={j}>{n}</Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
