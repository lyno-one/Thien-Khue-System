"use client";

import { useState } from "react";
import { anhSanPhamLyno } from "@/lib/anh-lyno";

export function AnhSanPhamLyno({ sp, className }: { sp: { ten: string; ma?: string; anh_url?: string | null }; className?: string }) {
  const [anhLoi, setAnhLoi] = useState<string | null>(null);
  const duPhong = anhSanPhamLyno(sp);
  const anhGoc = sp.anh_url || duPhong.src;
  const src = anhLoi === anhGoc ? duPhong.src : anhGoc;
  const minhHoa = (!sp.anh_url || anhLoi === anhGoc) && duPhong.minhHoa;
  return (
    <span className={`relative block overflow-hidden bg-be-mat-phu ${className ?? ""}`}>
      <img src={src} alt={minhHoa ? `Ảnh minh họa dòng sản phẩm: ${sp.ten}` : sp.ten} loading="lazy" decoding="async" onError={() => setAnhLoi(anhGoc)} className="h-full w-full object-cover" />
      {minhHoa && <span className="absolute bottom-2 left-2 rounded bg-be-mat/90 px-2 py-1 text-[10px] text-chu-phu">Ảnh minh họa</span>}
    </span>
  );
}
