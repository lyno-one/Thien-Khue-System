"use client";

import type { DanhSachThongBao, ThongBaoCuaToi } from "@thien-khue/contracts";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { dinhDangNgayGio } from "@/lib/dinh-dang";

/*
 * Chuong thong bao tren thanh tren (khung sidebar): dem chua doc (hoi dinh ky), mo ra xem 10 thong bao moi nhat,
 * bam vao -> danh dau da doc + di toi lien_ket. Trang day du o /thong-bao.
 */

const CHU_KY_HOI_MS = 60_000;

/** Chi chuyen huong noi bo (lien_ket do server ghi, van chan "//host" va URL ngoai) */
export function duongDanNoiBo(lienKet: string | null): string | null {
  return lienKet && lienKet.startsWith("/") && !lienKet.startsWith("//") ? lienKet : null;
}

export function ChuongThongBao() {
  const router = useRouter();
  const [chuaDoc, setChuaDoc] = useState(0);
  const [mo, setMo] = useState(false);
  const [ds, setDs] = useState<ThongBaoCuaToi[] | null>(null);
  const [loi, setLoi] = useState(false);
  const khung = useRef<HTMLDivElement>(null);

  const demChuaDoc = useCallback(async () => {
    try {
      setChuaDoc((await api.get<{ chua_doc: number }>("/thong-bao/chua-doc")).chua_doc);
    } catch {
      /* chuong chi la phan phu: loi mang thi giu so cu */
    }
  }, []);

  useEffect(() => {
    void demChuaDoc();
    const t = setInterval(() => {
      if (document.visibilityState === "visible") void demChuaDoc();
    }, CHU_KY_HOI_MS);
    return () => clearInterval(t);
  }, [demChuaDoc]);

  // Mo danh sach thi tai moi nhat
  useEffect(() => {
    if (!mo) return;
    setLoi(false);
    api
      .get<DanhSachThongBao>("/thong-bao", { gioi_han: 10 })
      .then(kq => {
        setDs(kq.ds);
        setChuaDoc(kq.chua_doc);
      })
      .catch(() => setLoi(true));
  }, [mo]);

  // Bam ra ngoai / Esc thi dong
  useEffect(() => {
    if (!mo) return;
    const ngoai = (e: MouseEvent) => {
      if (khung.current && !khung.current.contains(e.target as Node)) setMo(false);
    };
    const phim = (e: KeyboardEvent) => e.key === "Escape" && setMo(false);
    document.addEventListener("mousedown", ngoai);
    document.addEventListener("keydown", phim);
    return () => {
      document.removeEventListener("mousedown", ngoai);
      document.removeEventListener("keydown", phim);
    };
  }, [mo]);

  async function bamVao(t: ThongBaoCuaToi) {
    setMo(false);
    if (!t.da_doc) {
      setDs(d => d?.map(x => (x.id === t.id ? { ...x, da_doc: true } : x)) ?? d);
      setChuaDoc(n => Math.max(0, n - 1));
      void api.post("/thong-bao/da-doc", { ids: [t.id] }).catch(() => void demChuaDoc());
    }
    const di = duongDanNoiBo(t.lien_ket);
    if (di) router.push(di);
  }

  async function docTatCa() {
    setDs(d => d?.map(x => ({ ...x, da_doc: true })) ?? d);
    setChuaDoc(0);
    try {
      await api.post("/thong-bao/da-doc", {});
    } catch {
      void demChuaDoc();
    }
  }

  return (
    <div ref={khung} className="relative">
      <button
        type="button"
        onClick={() => setMo(v => !v)}
        aria-label={chuaDoc ? `Thông báo, ${chuaDoc} chưa đọc` : "Thông báo"}
        aria-expanded={mo}
        aria-haspopup="true"
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-chu-phu transition-colors duration-nhanh hover:bg-be-mat-phu hover:text-chu"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {chuaDoc > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-loi px-1 text-[11px] font-semibold leading-none text-tren-chinh">
            {chuaDoc > 99 ? "99+" : chuaDoc}
          </span>
        )}
      </button>

      {mo && (
        <div className="absolute right-0 top-11 z-40 w-[min(360px,calc(100vw-32px))] overflow-hidden rounded-xl border border-vien bg-be-mat shadow-xl" role="dialog" aria-label="Thông báo">
          <div className="flex items-center justify-between border-b border-vien px-4 py-3">
            <strong className="text-sm text-chu">Thông báo</strong>
            {chuaDoc > 0 && (
              <button type="button" onClick={() => void docTatCa()} className="text-sm font-medium text-lien-ket hover:underline">
                Đánh dấu đã đọc hết
              </button>
            )}
          </div>
          <div className="cuon-mong max-h-[420px] overflow-y-auto">
            {loi ? (
              <p className="m-0 px-4 py-6 text-center text-sm text-chu-phu">Không tải được thông báo. Thử lại sau.</p>
            ) : !ds ? (
              <p className="m-0 px-4 py-6 text-center text-sm text-chu-phu">Đang tải…</p>
            ) : !ds.length ? (
              <p className="m-0 px-4 py-6 text-center text-sm text-chu-phu">Chưa có thông báo nào.</p>
            ) : (
              <ul className="m-0 list-none p-0">
                {ds.map(t => (
                  <li key={t.id} className="border-b border-vien last:border-b-0">
                    <button type="button" onClick={() => void bamVao(t)} className={cn("flex w-full gap-3 px-4 py-3 text-left hover:bg-be-mat-phu", !t.da_doc && "bg-chinh-nhat/40")}>
                      <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", t.da_doc ? "bg-transparent" : "bg-chinh")} aria-hidden />
                      <span className="flex min-w-0 flex-col gap-0.5">
                        <span className={cn("text-sm text-chu", !t.da_doc && "font-semibold")}>{t.tieu_de}</span>
                        {t.noi_dung && <span className="line-clamp-2 text-sm text-chu-phu">{t.noi_dung}</span>}
                        <span className="text-xs text-chu-mo">{dinhDangNgayGio(t.created_at)}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <Link href="/thong-bao" onClick={() => setMo(false)} className="block border-t border-vien px-4 py-3 text-center text-sm font-medium text-lien-ket no-underline hover:bg-be-mat-phu">
            Xem tất cả
          </Link>
        </div>
      )}
    </div>
  );
}
