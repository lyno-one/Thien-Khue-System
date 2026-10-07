"use client";

import type { ChiTietSanPhamCongKhai, SanPhamCongKhai } from "@thien-khue/contracts";
import Link from "next/link";
import { useState } from "react";
import { KhungCho, lopChip, lopChipTong, lopLienKet, lopNutVien } from "@/components/ui";
import { cn } from "@/lib/cn";
import { api } from "@/lib/api";
import { dinhDangTien } from "@/lib/dinh-dang";
import { useDuLieu } from "./dung-du-lieu";
import { Kicker } from "./thanh-phan";

/*
 * Khoi "Sản phẩm minh họa" trong bai hoc — anh / ten / gia THAT tu kho mau CRM qua API cong khai
 * (GET /api/cong-khai/san-pham, /san-pham/:ma — route @CongKhai, khong gan token).
 *   - Khoa SAN_PHAM co ma_mau: dung mau do (anh, ten, gia, chat lieu, form dang).
 *   - Bai chung: 4 mau dang ban tieu bieu (moi cap nhat, con hang truoc) kem gia.
 * Mau khong co anh / anh loi: khung token ghi ten mau (khong hien chu giu cho "[...]").
 * Anh nam o Supabase Storage cua CRM (host tuy moi truong) nen dung <img loading="lazy">, khong next/image.
 */

const SO_MAU_CHUNG = 4;

function giaHienThi(gia: number | null): string {
  return gia === null ? "Liên hệ" : dinhDangTien(gia);
}

function lienKetMau(ma: string): string {
  return `/san-pham/${encodeURIComponent(ma)}`;
}

/** Anh mau: tai loi hoac khong co anh -> khung be-mat-phu ghi ten + ma */
function AnhMau({ sp, className }: { sp: Pick<SanPhamCongKhai, "anh_url" | "ten" | "ma">; className?: string }) {
  const [loi, setLoi] = useState(false);
  if (!sp.anh_url || loi) {
    return (
      <div className={cn("flex flex-col items-center justify-center gap-1 bg-be-mat-phu px-3 text-center", className)}>
        <span className="font-mono text-xs text-chu-phu">{sp.ma}</span>
        <span className="text-xs text-chu-mo">{sp.ten}</span>
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={sp.anh_url}
      alt={sp.ten}
      loading="lazy"
      decoding="async"
      onError={() => setLoi(true)}
      className={cn("bg-be-mat-phu object-cover", className)}
    />
  );
}

/** Dong loi trong khung (DESIGN.md "Loi trong khung"): icon `loi`, cau `chu-phu`, nut phu Thu lai */
function LoiTrongKhung({ chu, thuLai }: { chu: string; thuLai: () => void }) {
  return (
    <div role="alert" className="flex flex-wrap items-center gap-3 rounded-lg bg-be-mat-phu px-4 py-3">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden className="shrink-0 text-loi">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7.5v5.5" />
        <path d="M12 16.5h.01" />
      </svg>
      <span className="min-w-0 flex-1 text-sm text-chu-phu">{chu}</span>
      <button type="button" onClick={thuLai} className={lopNutVien}>
        Thử lại
      </button>
    </div>
  );
}

/** Mot mau cu the (khoa SAN_PHAM): anh 3/4 ben trai, thong tin ben phai */
function MotMau({ ma }: { ma: string }) {
  const { data, dangTai, loi, taiLai } = useDuLieu(`dao-tao:sp-minh-hoa:${ma}`, () =>
    api.get<ChiTietSanPhamCongKhai>(`/cong-khai/san-pham/${encodeURIComponent(ma)}`, undefined, { congKhai: true })
  );

  if (dangTai) {
    return (
      <div className="grid grid-cols-[112px_minmax(0,1fr)] gap-4 sm:grid-cols-[200px_minmax(0,1fr)]">
        <KhungCho className="aspect-[3/4] rounded-lg" />
        <div className="flex flex-col gap-2">
          <KhungCho className="h-6 w-2/3 rounded" />
          <KhungCho className="h-5 w-1/3 rounded" />
        </div>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="grid grid-cols-[112px_minmax(0,1fr)] gap-4 sm:grid-cols-[200px_minmax(0,1fr)]">
        <AnhMau sp={{ ma, ten: "Chưa có ảnh", anh_url: null }} className="aspect-[3/4] w-full rounded-lg" />
        <LoiTrongKhung chu={loi ? `Không tải được mẫu ${ma} từ kho mẫu. ${loi}` : `Không tìm thấy mẫu ${ma} đang hiển thị.`} thuLai={taiLai} />
      </div>
    );
  }

  const thuocTinh: [string, string | null][] = [
    ["Chất liệu", data.chat_lieu],
    ["Form dáng", data.form_dang],
    ["Màu còn hàng", data.mau_sac.length ? data.mau_sac.join(", ") : null],
    ["Size còn", data.size_con.length ? data.size_con.join(", ") : null]
  ];

  return (
    <div className="grid grid-cols-[112px_minmax(0,1fr)] gap-4 sm:grid-cols-[200px_minmax(0,1fr)]">
      <Link href={lienKetMau(data.ma)} className="relative block aspect-[3/4] overflow-hidden rounded-lg bg-be-mat-phu" aria-label={data.ten}>
        <AnhMau sp={data} className="absolute inset-0 h-full w-full" />
      </Link>
      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex flex-col gap-1">
          <span className="font-mono text-xs text-chu-phu">
            {data.ma} · {data.nhom}
          </span>
          <span className="text-h3 text-chu">{data.ten}</span>
          <span className="so text-h3 text-chu">{giaHienThi(data.gia_ban)}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className={cn(lopChip, data.con_hang ? lopChipTong["thanh-cong"] : lopChipTong["canh-bao"])}>
            {data.con_hang ? "Đang bán" : "Hết hàng"}
          </span>
        </div>
        <dl className="m-0 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1 text-sm">
          {thuocTinh
            .filter(([, v]) => v)
            .map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-chu-phu">{k}</dt>
                <dd className="m-0 text-chu">{v}</dd>
              </div>
            ))}
        </dl>
        <Link href={lienKetMau(data.ma)} className={cn(lopLienKet, "self-start text-sm")}>
          Xem trang sản phẩm →
        </Link>
      </div>
    </div>
  );
}

/** 4 mau dang ban tieu bieu (bai chung) */
function MauTieuBieu() {
  const { data, dangTai, loi, taiLai } = useDuLieu("dao-tao:sp-minh-hoa:chung", () =>
    api.get<SanPhamCongKhai[]>("/cong-khai/san-pham", { gioi_han: 12, sap_xep: "moi" }, { congKhai: true })
  );

  if (dangTai) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: SO_MAU_CHUNG }, (_, i) => (
          <KhungCho key={i} className="aspect-[3/4] rounded-lg" />
        ))}
      </div>
    );
  }
  if (!data) return <LoiTrongKhung chu={`Không tải được mẫu từ kho mẫu.${loi ? ` ${loi}` : ""}`} thuLai={taiLai} />;

  // Uu tien mau con hang va co anh; thieu thi lay them mau con lai
  const conHang = data.filter(sp => sp.con_hang);
  const xep = [...conHang.filter(sp => sp.anh_url), ...conHang.filter(sp => !sp.anh_url), ...data.filter(sp => !sp.con_hang)];
  const ds = xep.slice(0, SO_MAU_CHUNG);
  if (!ds.length) return <p className="m-0 py-6 text-center text-sm text-chu-mo">Kho mẫu chưa có sản phẩm đang bán.</p>;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {ds.map(sp => (
        <Link key={sp.ma} href={lienKetMau(sp.ma)} className="group flex min-w-0 flex-col gap-2 no-underline">
          <span className="relative block aspect-[3/4] overflow-hidden rounded-lg bg-be-mat-phu">
            <AnhMau sp={sp} className="absolute inset-0 h-full w-full" />
            {!sp.con_hang && <span className={cn(lopChip, lopChipTong["canh-bao"], "absolute left-2 top-2")}>Hết hàng</span>}
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-medium text-chu group-hover:text-chinh-dam">{sp.ten}</span>
            <span className="text-xs text-chu-phu">
              <span className="font-mono">{sp.ma}</span> · <span className="so">{giaHienThi(sp.gia_ban)}</span>
            </span>
          </span>
        </Link>
      ))}
    </div>
  );
}

/** Khung "Sản phẩm minh họa" — maMau co gia tri (khoa SAN_PHAM) thi hien dung mau do */
export function SanPhamMinhHoa({ maMau }: { maMau: string | null }) {
  return (
    <section className="flex flex-col gap-4 rounded-xl border border-vien bg-be-mat p-4 md:p-5" aria-label="Sản phẩm minh họa">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Kicker>{maMau ? `Sản phẩm của bài · ${maMau}` : "Sản phẩm minh họa"}</Kicker>
        <Link href="/san-pham" className={cn(lopLienKet, "text-sm")}>
          Xem tất cả mẫu
        </Link>
      </div>
      {maMau ? <MotMau ma={maMau} /> : <MauTieuBieu />}
    </section>
  );
}
