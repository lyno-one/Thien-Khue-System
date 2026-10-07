"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Bang, DangTai, KhungCho, Loi, lopChip, lopChipTong, lopKicker, lopLienKet, lopTab, lopThanhTab, lopThe, Nhan, Nut, NutLienKet, ThongBaoNoiDong, Trong } from "@/components/ui";
import { cn } from "@/lib/cn";
import { dinhDangNgayGio } from "@/lib/dinh-dang";
import { daoTaoApi } from "./api";
import { lamMoi, lamMoiTienDo, useDuLieu, useThaoTac } from "./dung-du-lieu";
import { useKhoaHoc } from "./hooks";
import type { BaiKiemTraTomTat, DeThi, KetQuaNopBai, LuotLamTomTat } from "./kieu";
import { cauThayDoi } from "./tinh-toan";

const KY_TU = "ABCDEFGH";

/** Dong ho dem nguoc toi han nop (neu bai co gioi han thoi gian) */
function DemNguoc({ hetHan }: { hetHan: string }) {
  const [con, setCon] = useState(() => new Date(hetHan).getTime() - Date.now());
  useEffect(() => {
    const t = setInterval(() => setCon(new Date(hetHan).getTime() - Date.now()), 1000);
    return () => clearInterval(t);
  }, [hetHan]);
  const giay = Math.max(0, Math.floor(con / 1000));
  const nhan = `${String(Math.floor(giay / 60)).padStart(2, "0")}:${String(giay % 60).padStart(2, "0")}`;
  return (
    <span
      role="timer"
      aria-live="off"
      className={cn(lopChip, "so py-1 text-sm font-semibold", giay <= 60 ? lopChipTong["canh-bao"] : lopChipTong.chinh)}
    >
      {giay > 0 ? `Còn ${nhan}` : "Hết giờ — nộp ngay"}
    </span>
  );
}

function moTaDe(bkt: Pick<BaiKiemTraTomTat, "so_cau" | "nguong_dat" | "so_lan_toi_da" | "so_lan_da_lam" | "thoi_gian_phut">, soCau?: number) {
  const phan = [`${soCau ?? bkt.so_cau} câu trắc nghiệm`, `Đạt khi đúng từ ${bkt.nguong_dat}%`];
  if (bkt.thoi_gian_phut) phan.push(`${bkt.thoi_gian_phut} phút`);
  phan.push(bkt.so_lan_toi_da == null ? "Làm lại không giới hạn" : `Còn ${Math.max(0, bkt.so_lan_toi_da - bkt.so_lan_da_lam)}/${bkt.so_lan_toi_da} lần làm`);
  return phan.join(" · ") + ".";
}

/** Lam bai kiem tra (LMS.dc.html — man "quiz"). /hoc-vien/bai-kiem-tra/<khoa_hoc_id>?de=<bai_kiem_tra_id> */
export function ManLamBai({ khoaHocId }: { khoaHocId: string }) {
  const khoa = useKhoaHoc(khoaHocId);
  const params = useSearchParams();
  const maDe = params.get("de");
  const dsKt = khoa.data?.bai_kiem_tra ?? [];
  const bkt = dsKt.find(k => k.id === maDe || k.ma === maDe) ?? dsKt.find(k => k.bat_buoc && !k.da_dat) ?? dsKt[0] ?? null;

  if (khoa.dangTai) {
    return (
      <div className="flex max-w-[820px] flex-col gap-5">
        <KhungCho className="h-24" />
        <KhungCho className="h-40" />
        <KhungCho className="h-40" />
      </div>
    );
  }
  if (!khoa.data) return <Loi tieuDe="Không tải được bài kiểm tra" chiTiet={khoa.loi} thuLai={khoa.taiLai} />;
  if (!bkt) {
    return (
      <Trong
        tieuDe="Khóa học này không có bài kiểm tra"
        hanhDong={
          <NutLienKet href={`/hoc-vien/khoa-hoc/${khoaHocId}`} kieu="vien" co="nho">
            Về khóa học
          </NutLienKet>
        }
      />
    );
  }
  return <LamBai key={bkt.id} bkt={bkt} khoaTen={khoa.data.ten} khoaId={khoa.data.id} dsKt={dsKt} />;
}

type Buoc = { kieu: "cho" } | { kieu: "dang-lam"; de: DeThi } | { kieu: "da-nop"; de: DeThi; kq: KetQuaNopBai };

function LamBai({ bkt, khoaTen, khoaId, dsKt }: { bkt: BaiKiemTraTomTat; khoaTen: string; khoaId: string; dsKt: BaiKiemTraTomTat[] }) {
  const [buoc, setBuoc] = useState<Buoc>({ kieu: "cho" });
  const [traLoi, setTraLoi] = useState<Record<string, number[]>>({});
  const batDau = useThaoTac();
  const nop = useThaoTac();
  const dauTrang = useRef<HTMLDivElement>(null);
  const daTuMo = useRef(false);
  const lichSu = useDuLieu<LuotLamTomTat[]>(`dao-tao:lich-su:${bkt.id}`, () => daoTaoApi.lichSuKiemTra(bkt.id));

  const het = bkt.so_lan_toi_da != null && bkt.so_lan_da_lam >= bkt.so_lan_toi_da;
  // Bai khong gio / khong gioi han lan: vao la lam ngay (giong thiet ke); co gio hoac gioi han: bam "Bắt đầu"
  const tuMo = !bkt.thoi_gian_phut && bkt.so_lan_toi_da == null && !bkt.da_dat;

  const chayBatDau = batDau.chay;
  const moDe = useCallback(async () => {
    const de = await chayBatDau(() => daoTaoApi.batDauKiemTra(bkt.id));
    if (de) {
      setTraLoi({});
      setBuoc({ kieu: "dang-lam", de });
      dauTrang.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [chayBatDau, bkt.id]);

  useEffect(() => {
    if (tuMo && !daTuMo.current) {
      daTuMo.current = true;
      void moDe();
    }
  }, [tuMo, moDe]);

  async function nopBai() {
    if (buoc.kieu !== "dang-lam") return;
    const de = buoc.de;
    const kq = await nop.chay(() => daoTaoApi.nopBai(bkt.id, { luot_lam_id: de.luot_lam_id, tra_loi: traLoi }));
    if (kq) {
      setBuoc({ kieu: "da-nop", de, kq });
      lamMoiTienDo();
      lamMoi(`dao-tao:lich-su:${bkt.id}`);
      dauTrang.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function chon(cauId: string, i: number, nhieu: boolean) {
    if (buoc.kieu !== "dang-lam") return;
    setTraLoi(t => {
      const cu = t[cauId] ?? [];
      if (!nhieu) return { ...t, [cauId]: [i] };
      const moi = cu.includes(i) ? cu.filter(x => x !== i) : [...cu, i].sort((a, b) => a - b);
      return { ...t, [cauId]: moi };
    });
  }

  const de = buoc.kieu === "cho" ? null : buoc.de;
  const kq = buoc.kieu === "da-nop" ? buoc.kq : null;
  const tongCau = de?.cau_hoi.length ?? bkt.so_cau;
  const daTraLoi = de ? de.cau_hoi.filter(c => (traLoi[c.id] ?? []).length > 0).length : 0;
  const giaiThich = new Map((kq?.giai_thich ?? []).map(g => [g.cau_hoi_id, g]));
  const conLai = kq?.so_lan_con_lai ?? (bkt.so_lan_toi_da == null ? null : bkt.so_lan_toi_da - bkt.so_lan_da_lam);
  const thongBaoCap = cauThayDoi(kq?.thay_doi);

  return (
    <div ref={dauTrang} className="flex max-w-[820px] scroll-mt-24 flex-col gap-5">
      <div className="flex flex-col gap-1">
        <Link href={`/hoc-vien/khoa-hoc/${khoaId}`} className={cn(lopLienKet, "inline-flex min-h-9 items-center self-start text-sm")}>
          ← {khoaTen}
        </Link>
        <div className={lopKicker}>Bài kiểm tra cuối khóa</div>
        <h1 className="m-0 text-h1 text-chu">{khoaTen}</h1>
        <p className="m-0 text-sm text-chu-phu">{moTaDe(bkt, de?.cau_hoi.length)}</p>
        {dsKt.length > 1 && (
          <div className={cn(lopThanhTab, "mt-2 self-start")}>
            {dsKt.map(k => (
              <Link key={k.id} href={`?de=${k.id}`} aria-current={k.id === bkt.id ? "page" : undefined} className={lopTab(k.id === bkt.id)}>
                {k.tieu_de}
                {k.da_dat ? " ✓" : ""}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* KET QUA */}
      {kq && (
        <div
          role="status"
          className={cn(
            "flex flex-col gap-1 rounded-xl border p-4 md:p-5",
            kq.dat ? "border-thanh-cong/30 bg-thanh-cong-nhat text-thanh-cong" : "border-chinh/20 bg-chinh-nhat text-chinh-dam"
          )}
        >
          <div className="text-h2">
            Bạn đúng <span className="so">{kq.so_cau_dung}/{kq.tong_cau}</span> câu · <span className="so">{kq.diem}%</span>
          </div>
          <div className="text-sm">
            {kq.dat
              ? `Đạt yêu cầu (từ ${kq.nguong_dat}%).`
              : `Chưa đạt (cần ${kq.nguong_dat}%). Xem lại các bài học rồi làm lại nhé.`}
            {kq.ghi_chu ? ` ${kq.ghi_chu}` : ""}
          </div>
          {thongBaoCap.length > 0 && <div className="text-sm font-semibold">{thongBaoCap.join(" ")}</div>}
          {!kq.dat && conLai != null && <div className="text-sm">Còn {Math.max(0, conLai)} lần làm.</div>}
        </div>
      )}

      {/* CHUA BAT DAU */}
      {buoc.kieu === "cho" && (
        <div className={cn(lopThe, "flex flex-col gap-4 p-4 md:p-5")}>
          {batDau.dangXuLy ? (
            <DangTai chu="Đang mở đề…" className="py-6" />
          ) : (
            <>
              {bkt.da_dat ? (
                <ThongBaoNoiDong kieu="thanh-cong">Bạn đã đạt bài này{bkt.diem_cao_nhat != null ? ` với ${bkt.diem_cao_nhat}%` : ""}. Có thể làm lại để ôn tập.</ThongBaoNoiDong>
              ) : bkt.lan_cuoi ? (
                <p className="m-0 text-sm text-chu-phu">
                  Lần gần nhất: {bkt.lan_cuoi.diem}% ({bkt.lan_cuoi.dat ? "đạt" : "chưa đạt"}) · {dinhDangNgayGio(bkt.lan_cuoi.nop_luc)}
                </p>
              ) : (
                <p className="m-0 text-sm text-chu-phu">Đọc kỹ từng câu, chọn đáp án rồi bấm “Nộp bài”. Phải trả lời hết các câu.</p>
              )}
              {bkt.thoi_gian_phut && <p className="m-0 text-xs text-chu-mo">Đồng hồ bắt đầu chạy khi bạn bấm “Bắt đầu làm bài”.</p>}
              {batDau.loi && <ThongBaoNoiDong kieu="loi">{batDau.loi}</ThongBaoNoiDong>}
              {het && !bkt.da_dat ? (
                <ThongBaoNoiDong kieu="canh-bao">Bạn đã dùng hết số lần làm bài. Liên hệ mentor / quản lý để được hỗ trợ.</ThongBaoNoiDong>
              ) : (
                <Nut onClick={() => void moDe()} co="lon" className="self-start">
                  {bkt.da_dat ? "Làm lại để ôn tập" : bkt.so_lan_da_lam > 0 ? "Làm lại" : "Bắt đầu làm bài"}
                </Nut>
              )}
            </>
          )}
        </div>
      )}

      {/* CAU HOI */}
      {de &&
        de.cau_hoi.map((c, ci) => {
          const gt = giaiThich.get(c.id);
          const chonCuaToi = traLoi[c.id] ?? [];
          return (
            <fieldset key={c.id} className={cn(lopThe, "m-0 flex min-w-0 flex-col gap-3 p-4 md:p-5")}>
              <legend className="px-1 text-xs font-semibold text-chu-phu">
                Câu {ci + 1}
                {c.nhieu_dap_an ? " · Chọn nhiều đáp án" : ""}
              </legend>
              <div className="text-h3 text-chu">{c.noi_dung}</div>
              <div className="grid gap-2 sm:grid-cols-2">
                {c.lua_chon.map((lc, i) => {
                  const daChon = chonCuaToi.includes(i);
                  const laDung = !!gt && gt.dap_an.includes(i);
                  const daNop = buoc.kieu === "da-nop";
                  let lop = "border-vien-dam bg-be-mat text-chu hover:bg-be-mat-phu";
                  let dau = "";
                  if (daNop && laDung) {
                    lop = "border-thanh-cong bg-thanh-cong-nhat text-thanh-cong";
                    dau = "· Đáp án đúng";
                  } else if (daNop && daChon) {
                    lop = "border-loi/40 bg-loi-nhat text-loi";
                    dau = "· Bạn chọn";
                  } else if (daNop) {
                    lop = "border-vien bg-be-mat text-chu-phu";
                  } else if (daChon) {
                    lop = "border-chinh bg-chinh-nhat font-semibold text-chinh-dam ring-1 ring-chinh";
                  }
                  return (
                    <button
                      key={i}
                      type="button"
                      role={c.nhieu_dap_an ? "checkbox" : "radio"}
                      aria-checked={daChon}
                      disabled={daNop}
                      onClick={() => chon(c.id, i, c.nhieu_dap_an)}
                      className={cn(
                        "min-h-11 rounded-lg border px-3 py-2 text-left text-sm transition-colors duration-nhanh disabled:cursor-default",
                        lop
                      )}
                    >
                      <span className="font-semibold">{KY_TU[i] ?? i + 1}.</span> {lc}{" "}
                      {dau && <span className="text-xs font-semibold">{dau}</span>}
                    </button>
                  );
                })}
              </div>
              {gt?.giai_thich && <p className="m-0 text-sm text-chu-phu">Giải thích: {gt.giai_thich}</p>}
            </fieldset>
          );
        })}

      {/* NUT */}
      {de && (
        <div className="flex flex-wrap items-center gap-3">
          {buoc.kieu === "dang-lam" && (
            <>
              <Nut onClick={() => void nopBai()} dangXuLy={nop.dangXuLy} disabled={daTraLoi < tongCau} co="lon">
                Nộp bài
              </Nut>
              <span className="text-sm text-chu-phu">
                Đã trả lời <span className="so">{daTraLoi}/{tongCau}</span> câu
              </span>
              {de.het_han_luc && <DemNguoc hetHan={de.het_han_luc} />}
            </>
          )}
          {buoc.kieu === "da-nop" && (
            <>
              {conLai !== 0 && (
                <Nut kieu="vien" co="lon" onClick={() => void moDe()} dangXuLy={batDau.dangXuLy}>
                  Làm lại
                </Nut>
              )}
              {kq?.dat ? (
                <NutLienKet href="/hoc-vien/chung-chi" kieu="vien" co="lon">
                  Xem chứng chỉ
                </NutLienKet>
              ) : (
                <NutLienKet href={`/hoc-vien/khoa-hoc/${khoaId}`} kieu="vien" co="lon">
                  Xem lại bài học
                </NutLienKet>
              )}
            </>
          )}
        </div>
      )}
      {nop.loi && <ThongBaoNoiDong kieu="loi">{nop.loi}</ThongBaoNoiDong>}
      {buoc.kieu === "dang-lam" && batDau.loi && <ThongBaoNoiDong kieu="loi">{batDau.loi}</ThongBaoNoiDong>}

      {/* LICH SU */}
      {lichSu.data && lichSu.data.filter(l => l.nop_luc).length > 0 && (
        <section className="flex flex-col gap-3 pt-4">
          <h2 className="m-0 text-h2 text-chu">Lịch sử làm bài</h2>
          <Bang<LuotLamTomTat>
            cot={[
              { khoa: "nop_luc", tieuDe: "Nộp lúc", hienThi: l => dinhDangNgayGio(l.nop_luc) },
              { khoa: "cau", tieuDe: "Số câu đúng", hienThi: l => `${l.so_cau_dung}/${l.tong_cau}` },
              { khoa: "diem", tieuDe: "Điểm", canPhai: true, hienThi: l => `${l.diem}%` },
              {
                khoa: "dat",
                tieuDe: "Kết quả",
                hienThi: l => <Nhan tong={l.dat ? "thanh-cong" : "trung-tinh"}>{l.dat ? "Đạt" : "Chưa đạt"}</Nhan>
              },
              { khoa: "pb", tieuDe: "Tài liệu", hienThi: l => `v${l.phien_ban_tai_lieu}` }
            ]}
            dong={lichSu.data.filter(l => l.nop_luc)}
            khoaDong={l => l.id}
          />
        </section>
      )}
    </div>
  );
}
