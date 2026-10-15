"use client";

import { useEffect, useId, useRef } from "react";
import { cn } from "@/lib/cn";
import { lopNutIcon } from "./lop";

/*
 * Hop thoai (modal) dung <dialog> goc: ESC dong, khoa focus trong hop, nen mo.
 * Theo CRM DESIGN.md: bo 12, bong 3, nen mo dan 160ms + hop nhich len 220ms (animate-hien-nen / animate-hien-hop).
 *   <HopThoai mo={mo} dong={() => setMo(false)} tieuDe="Xác nhận" chanTrang={<Nut onClick={...}>Đồng ý</Nut>}>…</HopThoai>
 */
export function HopThoai({
  mo,
  dong,
  tieuDe,
  moTa,
  chanTrang,
  children,
  rong = "vua"
}: {
  mo: boolean;
  dong: () => void;
  tieuDe: React.ReactNode;
  moTa?: React.ReactNode;
  chanTrang?: React.ReactNode;
  children?: React.ReactNode;
  rong?: "nho" | "vua" | "lon";
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const maTieuDe = useId();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (mo && !d.open) d.showModal();
    if (!mo && d.open) d.close();
  }, [mo]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={maTieuDe}
      onClose={dong}
      onClick={e => {
        if (e.target === ref.current) dong(); // bam ra nen
      }}
      className={cn(
        "m-auto w-[calc(100%-32px)] rounded-xl border border-vien bg-be-mat p-0 text-chu shadow-xl animate-hien-hop backdrop:bg-chu/40 backdrop:animate-hien-nen",
        rong === "nho" ? "max-w-[420px]" : rong === "lon" ? "max-w-[860px]" : "max-w-[600px]"
      )}
    >
      {mo && (
        <div className="flex max-h-[85vh] flex-col">
          <div className="flex items-start justify-between gap-4 border-b border-vien px-5 py-4">
            <div className="flex flex-col gap-1">
              <h2 id={maTieuDe} className="m-0 text-h3 text-chu">
                {tieuDe}
              </h2>
              {moTa && <p className="m-0 text-sm text-chu-phu">{moTa}</p>}
            </div>
            <button type="button" onClick={dong} aria-label="Đóng" className={cn(lopNutIcon, "-mr-2 -mt-1")}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                <path d="M6 6l12 12" />
                <path d="M18 6L6 18" />
              </svg>
            </button>
          </div>
          <div className="overflow-y-auto px-5 py-4">{children}</div>
          {chanTrang && <div className="flex flex-wrap justify-end gap-2 border-t border-vien bg-be-mat px-5 py-4">{chanTrang}</div>}
        </div>
      )}
    </dialog>
  );
}
