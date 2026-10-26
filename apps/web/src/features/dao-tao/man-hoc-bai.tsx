"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { DangTai, KhungCho, Loi, lopLienKet, lopNhomNav, lopNutMa, lopThe, Nhan, Nut, NutLienKet, ThongBaoNoiDong, Trong } from "@/components/ui";
import { cn } from "@/lib/cn";
import { daoTaoApi } from "./api";
import { lamMoiTienDo, useThaoTac } from "./dung-du-lieu";
import { useBaiHoc, useKhoaHoc } from "./hooks";
import { KhoiLuyenAi } from "./khoi-luyen-ai";
import { KhoiThucHanh } from "./khoi-thuc-hanh";
import type { BaiHocChiTiet } from "./kieu";
import { NoiDungMarkdown } from "./noi-dung-markdown";
import { SanPhamMinhHoa } from "./san-pham-minh-hoa";
import { DauBai, Kicker, ThanhTienDo } from "./thanh-phan";
import { baiChuaXong, boTieuDeTrung, cauThayDoi, nhanThoiLuong, phangBai, phanTram } from "./tinh-toan";

export type VideoDaPhanTich = { kieu: "iframe" | "video" | "lien-ket"; src: string };

/** URL nhung video: YouTube -> iframe embed; file .mp4/.webm -> <video>; con lai -> lien ket. Chi nhan http(s). Dung chung voi bai Lyno. */
export function phanTichVideo(url: string): VideoDaPhanTich | null {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  const host = u.hostname.replace(/^www\./, "");
  if (host === "youtube.com" || host === "m.youtube.com") {
    const v = u.searchParams.get("v");
    if (v) return { kieu: "iframe", src: `https://www.youtube-nocookie.com/embed/${encodeURIComponent(v)}` };
  }
  if (host === "youtu.be") return { kieu: "iframe", src: `https://www.youtube-nocookie.com/embed/${encodeURIComponent(u.pathname.slice(1))}` };
  if (/\.(mp4|webm|ogg)$/i.test(u.pathname)) return { kieu: "video", src: u.toString() };
  return { kieu: "lien-ket", src: u.toString() };
}

function NutPhat() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

/** Video nhung (iframe YouTube / the <video>) tren nen muc toi; kieu lien-ket -> null (noi goi tu hien nut mo) */
export function VideoNhung({ v, tieuDe }: { v: VideoDaPhanTich; tieuDe: string }) {
  if (v.kieu === "iframe") {
    return (
      <div className="aspect-video overflow-hidden rounded-xl bg-muc-900">
        <iframe
          src={v.src}
          title={`Video: ${tieuDe}`}
          className="h-full w-full border-0"
          allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }
  if (v.kieu === "video") {
    return <video src={v.src} controls preload="metadata" className="aspect-video w-full rounded-xl bg-muc-900" />;
  }
  return null;
}

/** Khung video bai hoc: video that tren nen muc toi; chua co video -> khung chinh-nhat, nut phat xanh */
function KhungVideo({ bai }: { bai: BaiHocChiTiet }) {
  const v = bai.video_url ? phanTichVideo(bai.video_url) : null;
  if (v && v.kieu !== "lien-ket") return <VideoNhung v={v} tieuDe={bai.tieu_de} />;
  return (
    <div className="flex aspect-video flex-col items-center justify-center gap-3 rounded-xl border border-vien bg-chinh-nhat px-4 text-center">
      {v ? (
        <a
          href={v.src}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Mở video bài học"
          className="flex h-16 w-16 items-center justify-center rounded-full bg-chinh text-tren-chinh transition-colors duration-nhanh hover:bg-chinh-dam"
        >
          <NutPhat />
        </a>
      ) : (
        <span aria-hidden className="flex h-16 w-16 items-center justify-center rounded-full bg-be-mat text-chu-mo ring-1 ring-vien">
          <NutPhat />
        </span>
      )}
      <span className="text-sm text-chu-phu">
        {v ? "Mở video bài học" : "Video bài học đang cập nhật"} · {nhanThoiLuong(bai.thoi_luong_phut)}
      </span>
    </div>
  );
}

/** Hoc bai (LMS — man "course"): chuong / bai ben trai, noi dung bai ben phai. ?bai=<bai_hoc_id> */
export function ManHocBai({ id }: { id: string }) {
  const { data: khoa, dangTai, loi, taiLai } = useKhoaHoc(id);
  const params = useSearchParams();
  const router = useRouter();
  const duongDan = usePathname();
  const thaoTac = useThaoTac();
  const [thongBao, setThongBao] = useState<string[]>([]);
  // Danh dau tam (lac quan) truoc khi server tra ve
  const [tam, setTam] = useState<Record<string, boolean>>({});
  const dauNoiDung = useRef<HTMLHeadingElement>(null);

  const dsBai = useMemo(
    () => phangBai(khoa?.chuong ?? []).map(b => (b.id in tam ? { ...b, da_xong: tam[b.id]! } : b)),
    [khoa, tam]
  );
  const maBai = params.get("bai");
  const baiChon = dsBai.find(b => b.id === maBai || b.ma === maBai) ?? baiChuaXong(dsBai);
  const viTri = baiChon ? dsBai.indexOf(baiChon) : -1;
  const baiSau = viTri >= 0 ? dsBai[viTri + 1] : undefined;
  const baiTruoc = viTri > 0 ? dsBai[viTri - 1] : undefined;
  const xong = dsBai.filter(b => b.da_xong).length;
  const pt = phanTram(xong, dsBai.length);

  const chiTiet = useBaiHoc(baiChon?.id ?? null);

  // Server tra ve du lieu moi / thao tac loi -> bo danh dau tam
  useEffect(() => setTam({}), [khoa]);
  useEffect(() => {
    if (thaoTac.loi) setTam({});
  }, [thaoTac.loi]);

  function moBai(baiId: string) {
    setThongBao([]);
    router.replace(`${duongDan}?bai=${encodeURIComponent(baiId)}`, { scroll: false });
    dauNoiDung.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function doiHoanThanh(baiId: string, daXong: boolean) {
    const moi = !daXong;
    setTam(t => ({ ...t, [baiId]: moi }));
    const kq = await thaoTac.chay(() => (moi ? daoTaoApi.hoanThanhBai(baiId) : daoTaoApi.boHoanThanhBai(baiId)));
    if (kq) setThongBao(cauThayDoi(kq.thay_doi));
    lamMoiTienDo();
  }

  if (dangTai) {
    return (
      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <KhungCho className="h-[420px]" />
        <div className="flex flex-col gap-5">
          <KhungCho className="h-8 w-2/3 rounded-lg" />
          <KhungCho className="aspect-video" />
        </div>
      </div>
    );
  }
  if (!khoa) {
    return loi ? (
      <Loi tieuDe="Không tải được khóa học" chiTiet={loi} thuLai={taiLai} />
    ) : (
      <Trong
        tieuDe="Không tìm thấy khóa học"
        hanhDong={
          <NutLienKet href="/hoc-vien/khoa-hoc" kieu="vien" co="nho">
            Tất cả khóa học
          </NutLienKet>
        }
      />
    );
  }

  const dsKt = khoa.bai_kiem_tra;
  const ktChinh = dsKt.find(k => k.bat_buoc && !k.da_dat) ?? dsKt.find(k => !k.da_dat) ?? dsKt[0];
  const bai = chiTiet.data && chiTiet.data.id === baiChon?.id ? chiTiet.data : null;
  const daXong = baiChon?.da_xong ?? false;
  const noiDung = bai?.noi_dung ? boTieuDeTrung(bai.noi_dung, bai.tieu_de) : "";
  const q = khoa.quyen_sku;
  const coTomTatRieng = !!(bai?.tom_tat && noiDung && noiDung.trim() !== bai.tom_tat.trim());

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
      {/* DANH SACH BAI */}
      <aside className={cn(lopThe, "order-2 flex min-w-0 flex-col gap-3 p-4 lg:order-1")}>
        <Link href="/hoc-vien/khoa-hoc" className={cn(lopLienKet, "inline-flex min-h-9 items-center self-start text-sm")}>
          ← Tất cả khóa học
        </Link>
        <h2 className="m-0 text-h3 text-chu">{khoa.ten}</h2>
        {(khoa.ma_mau || khoa.tien_do.trang_thai === "CAN_HOC_LAI") && (
          <div className="flex flex-wrap gap-2">
            {khoa.ma_mau && <Nhan tong="chinh">Mã {khoa.ma_mau}</Nhan>}
            {khoa.ma_mau && <Nhan tong="trung-tinh">Tài liệu v{khoa.phien_ban_tai_lieu}</Nhan>}
            {khoa.tien_do.trang_thai === "CAN_HOC_LAI" && <Nhan tong="canh-bao">Cần học lại</Nhan>}
          </div>
        )}
        <ThanhTienDo phanTram={pt} nhan={`Tiến độ ${khoa.ten}`} />
        <div className="text-xs text-chu-phu">
          <span className="so">{pt}%</span> hoàn thành · {xong}/{dsBai.length} bài
        </div>
        {khoa.chuong.map((c, ci) => (
          <div key={`${c.ten ?? ""}-${ci}`} className="flex flex-col gap-1 pt-2">
            {c.ten && <div className={cn(lopNhomNav, "pb-1")}>{c.ten}</div>}
            {dsBai
              .filter(b => c.bai_hoc.some(x => x.id === b.id))
              .map(b => {
                const chon = b.id === baiChon?.id;
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => moBai(b.id)}
                    aria-current={chon ? "true" : undefined}
                    className={cn(
                      "flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors duration-nhanh",
                      chon ? "bg-chinh-nhat text-chinh-dam" : "text-chu hover:bg-be-mat-phu"
                    )}
                  >
                    <DauBai xong={b.da_xong} />
                    <span className="flex min-w-0 flex-col">
                      <span className={cn("text-sm", chon ? "font-semibold" : "font-medium")}>{b.tieu_de}</span>
                      <span className="text-xs text-chu-phu">{nhanThoiLuong(b.thoi_luong_phut)}</span>
                    </span>
                  </button>
                );
              })}
          </div>
        ))}
        {ktChinh && (
          <NutLienKet
            href={`/hoc-vien/bai-kiem-tra/${khoa.id}${dsKt.length > 1 ? `?de=${ktChinh.id}` : ""}`}
            kieu="nhat"
            rongHet
            className="mt-2"
          >
            Bài kiểm tra cuối khóa
            {ktChinh.da_dat ? " · Đã đạt" : ktChinh.diem_cao_nhat != null ? ` · Cao nhất ${ktChinh.diem_cao_nhat}%` : ""}
          </NutLienKet>
        )}
        {khoa.can_thuc_hanh && (
          <a href="#thuc-hanh" className={cn(lopLienKet, "self-center text-sm")}>
            {khoa.yeu_cau_luyen_ai ? "Luyện tư vấn với AI →" : "Bài thực hành →"}
          </a>
        )}
      </aside>

      {/* NOI DUNG BAI */}
      <div className="order-1 flex min-w-0 flex-col gap-5 lg:order-2">
        {q && q.trang_thai !== "HOAT_DONG" && (
          <ThongBaoNoiDong kieu="canh-bao">
            Quyền bán mã {q.ma_mau}: {q.trang_thai === "CAN_HOC_LAI" ? "cần học lại" : "đã thu hồi"}
            {q.ly_do ? ` — ${q.ly_do}` : ""}.{" "}
            <Link href="/hoc-vien/quyen-sku" className="font-semibold text-canh-bao underline underline-offset-2">
              Xem quyền SKU →
            </Link>
          </ThongBaoNoiDong>
        )}

        {!baiChon ? (
          <Trong tieuDe="Khóa học chưa có bài học" moTa="Nội dung đang được biên soạn." />
        ) : (
          <>
            <div className="flex flex-col gap-1">
              <div className="text-sm text-chu-phu">
                {khoa.ten}
                {baiChon.ten_chuong ? ` · ${baiChon.ten_chuong}` : ""} · Bài {viTri + 1}/{dsBai.length}
              </div>
              <h1 ref={dauNoiDung} className="m-0 scroll-mt-24 text-h1 text-chu">
                {baiChon.tieu_de}
              </h1>
            </div>

            {chiTiet.dangTai || (!bai && !chiTiet.loi) ? (
              <DangTai chu="Đang tải bài học…" />
            ) : !bai ? (
              <Loi tieuDe="Không tải được nội dung bài" chiTiet={chiTiet.loi} thuLai={chiTiet.taiLai} />
            ) : (
              <>
                {(bai.loai_noi_dung === "VIDEO" || bai.video_url) && <KhungVideo bai={bai} />}

                <div className={cn("grid items-start gap-5", (coTomTatRieng || khoa.ma_mau) && "md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]")}>
                  <div className={cn(lopThe, "flex min-w-0 flex-col gap-3 p-4 md:p-5")}>
                    <Kicker>Nội dung chính</Kicker>
                    {noiDung ? (
                      <NoiDungMarkdown md={noiDung} />
                    ) : (
                      <p className="m-0 max-w-[70ch] text-body-lg text-chu">{bai.tom_tat ?? "Nội dung bài học đang được cập nhật."}</p>
                    )}
                  </div>
                  {(coTomTatRieng || khoa.ma_mau) && (
                    <div className={cn(lopThe, "flex min-w-0 flex-col gap-3 p-4 md:p-5")}>
                      <Kicker>Tóm tắt &amp; tra cứu</Kicker>
                      {coTomTatRieng && <p className="m-0 text-sm text-chu-phu">{bai.tom_tat}</p>}
                      {khoa.ma_mau && (
                        <Link href={`/san-pham/${encodeURIComponent(khoa.ma_mau)}`} className={cn(lopLienKet, "text-sm")}>
                          Bảng size, chất liệu mã {khoa.ma_mau} →
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}

            <SanPhamMinhHoa maMau={khoa.ma_mau} />

            {thaoTac.loi && <ThongBaoNoiDong kieu="loi">{thaoTac.loi}</ThongBaoNoiDong>}
            {thongBao.length > 0 && <ThongBaoNoiDong kieu="thanh-cong">{thongBao.join(" ")}</ThongBaoNoiDong>}

            <div className="flex flex-wrap items-center gap-3">
              <Nut kieu={daXong ? "nhat" : "chinh"} onClick={() => void doiHoanThanh(baiChon.id, daXong)} dangXuLy={thaoTac.dangXuLy} aria-pressed={daXong}>
                {daXong ? "Đã hoàn thành ✓" : "Đánh dấu hoàn thành"}
              </Nut>
              {baiSau ? (
                <Nut kieu="vien" onClick={() => moBai(baiSau.id)}>
                  Bài tiếp theo →
                </Nut>
              ) : ktChinh && !ktChinh.da_dat ? (
                <NutLienKet href={`/hoc-vien/bai-kiem-tra/${khoa.id}`} kieu="vien">
                  Làm bài kiểm tra →
                </NutLienKet>
              ) : null}
              {baiTruoc && (
                <button type="button" onClick={() => moBai(baiTruoc.id)} className={lopNutMa}>
                  ← Bài trước
                </button>
              )}
            </div>

            {khoa.chung_chi && !khoa.chung_chi.thu_hoi_luc && (
              <ThongBaoNoiDong kieu="thanh-cong">
                Bạn đã hoàn thành khóa này.{" "}
                <Link href="/hoc-vien/chung-chi" className="font-semibold text-thanh-cong underline underline-offset-2">
                  Xem chứng chỉ →
                </Link>
              </ThongBaoNoiDong>
            )}
          </>
        )}

        {khoa.can_thuc_hanh && (khoa.yeu_cau_luyen_ai ? <KhoiLuyenAi khoa={khoa} /> : <KhoiThucHanh khoa={khoa} />)}
      </div>
    </div>
  );
}
