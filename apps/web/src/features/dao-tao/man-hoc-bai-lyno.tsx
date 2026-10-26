"use client";

import Link from "next/link";
import { useState } from "react";
import { DangTai, KhungCho, Loi, lopLienKet, lopThe, Nhan, Nut, ThongBaoNoiDong } from "@/components/ui";
import { cn } from "@/lib/cn";
import { useXacThuc } from "@/providers/auth-provider";
import { daoTaoApi } from "./api";
import { lamMoiBaiLyno, useThaoTac } from "./dung-du-lieu";
import { useBaiLyno, useLoTrinhBaiLyno, useQuizBaiLyno } from "./hooks";
import type { KetQuaQuizBaiLyno, QuizBaiLyno } from "./kieu";
import { KhongPhaiNhanSuLyno, trangThaiBaiLyno } from "./man-bai-lyno";
import { phanTichVideo, VideoNhung } from "./man-hoc-bai";
import { NoiDungMarkdown } from "./noi-dung-markdown";
import { Kicker } from "./thanh-phan";
import { boTieuDeTrung } from "./tinh-toan";

const KY_TU = "ABCDEFGHIJKLMNOPQRST";

/** Bai kiem tra cua bai Lyno: chon mot dap an moi cau, nop -> CRM cham; dat thi hien dap an + giai thich (neu CRM tra) */
function KhoiQuizLyno({ quiz, baiId }: { quiz: QuizBaiLyno; baiId: string }) {
  const [traLoi, setTraLoi] = useState<Record<string, number>>({});
  const [kq, setKq] = useState<KetQuaQuizBaiLyno | null>(null);
  const nop = useThaoTac();
  const tong = quiz.cauHoi.length;
  const daTraLoi = quiz.cauHoi.filter(c => traLoi[c.id] !== undefined).length;

  async function nopBai() {
    const ketQua = await nop.chay(() => daoTaoApi.baiLynoNopQuiz(quiz.quiz.id, traLoi));
    if (!ketQua) return;
    setKq(ketQua);
    lamMoiBaiLyno(baiId);
  }

  function lamLai() {
    setKq(null);
    setTraLoi({});
    nop.setLoi(null);
  }

  if (!tong) return <ThongBaoNoiDong kieu="thong-tin">Bài kiểm tra đang được soạn — quay lại sau nhé.</ThongBaoNoiDong>;

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="m-0 text-h2 text-chu">{quiz.quiz.tieu_de || "Bài kiểm tra"}</h2>
        <p className="m-0 text-sm text-chu-phu">
          {tong} câu · Cần đúng từ <span className="so">{quiz.quiz.nguong_dau}%</span> để hoàn thành bài.
        </p>
      </div>

      {kq && (
        <div
          role="status"
          className={cn(
            "flex flex-col gap-1 rounded-xl border p-4 md:p-5",
            kq.dau ? "border-thanh-cong/30 bg-thanh-cong-nhat text-thanh-cong" : "border-chinh/20 bg-chinh-nhat text-chinh-dam"
          )}
        >
          <div className="text-h2">
            Bạn đúng <span className="so">{kq.dung}/{kq.tong}</span> câu · <span className="so">{kq.diem}%</span>
          </div>
          <div className="text-sm">
            {kq.dau ? `Đạt yêu cầu (từ ${kq.nguongDau}%). Bài học đã hoàn thành.` : `Chưa đạt (cần ${kq.nguongDau}%). Xem lại bài rồi làm lại nhé.`}
          </div>
        </div>
      )}

      {quiz.cauHoi.map((c, ci) => {
        const gt = kq?.chiTiet[c.id];
        const daNop = !!kq;
        return (
          <fieldset key={c.id} className={cn(lopThe, "m-0 flex min-w-0 flex-col gap-3 p-4 md:p-5")}>
            <legend className="px-1 text-xs font-semibold text-chu-phu">Câu {ci + 1}</legend>
            <div className="text-h3 text-chu">{c.cau}</div>
            <div role="radiogroup" aria-label={`Câu ${ci + 1}`} className="grid gap-2 sm:grid-cols-2">
              {c.lua_chon.map((lc, i) => {
                const daChon = traLoi[c.id] === i;
                const laDung = gt?.dap_an === i;
                let lop = "border-vien-dam bg-be-mat text-chu hover:bg-be-mat-phu";
                let dau = "";
                if (daNop && laDung) {
                  lop = "border-thanh-cong bg-thanh-cong-nhat text-thanh-cong";
                  dau = "· Đáp án đúng";
                } else if (daNop && daChon) {
                  lop = gt ? "border-loi/40 bg-loi-nhat text-loi" : "border-chinh bg-chinh-nhat font-semibold text-chinh-dam";
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
                    role="radio"
                    aria-checked={daChon}
                    disabled={daNop}
                    onClick={() => setTraLoi(t => ({ ...t, [c.id]: i }))}
                    className={cn("min-h-11 rounded-lg border px-3 py-2 text-left text-sm transition-colors duration-nhanh disabled:cursor-default", lop)}
                  >
                    <span className="font-semibold">{KY_TU[i] ?? i + 1}.</span> {lc} {dau && <span className="text-xs font-semibold">{dau}</span>}
                  </button>
                );
              })}
            </div>
            {gt?.giai_thich && <p className="m-0 text-sm text-chu-phu">Giải thích: {gt.giai_thich}</p>}
          </fieldset>
        );
      })}

      {nop.loi && <ThongBaoNoiDong kieu="loi">{nop.loi}</ThongBaoNoiDong>}
      <div className="flex flex-wrap items-center gap-3">
        {!kq ? (
          <>
            <Nut onClick={() => void nopBai()} dangXuLy={nop.dangXuLy} disabled={daTraLoi < tong} co="lon">
              Nộp bài
            </Nut>
            <span className="text-sm text-chu-phu">
              Đã trả lời <span className="so">{daTraLoi}/{tong}</span> câu
            </span>
          </>
        ) : (
          <>
            {!kq.dau && (
              <Nut kieu="chinh" co="lon" onClick={lamLai}>
                Làm lại
              </Nut>
            )}
            <Link href="/hoc-vien/bai-hoc-lyno" className={cn(lopLienKet, "text-sm")}>
              ← Danh sách bài học Lyno
            </Link>
          </>
        )}
      </div>
    </section>
  );
}

/** Hoc mot bai Lyno (/hoc-vien/bai-hoc-lyno/<id>): video, noi dung, roi bai kiem tra hoac nut "Đánh dấu đã học" */
export function ManHocBaiLyno({ id }: { id: string }) {
  const { nguoiDung } = useXacThuc();
  const laNhanSu = !!nguoiDung?.ho_so.crm_user_id;
  const chiTiet = useBaiLyno(laNhanSu ? id : null);
  const quiz = useQuizBaiLyno(laNhanSu ? id : null);
  const loTrinh = useLoTrinhBaiLyno(laNhanSu);
  const daDoc = useThaoTac();

  if (!laNhanSu || loTrinh.data === null) return <KhongPhaiNhanSuLyno />;

  if (chiTiet.dangTai) {
    return (
      <div className="flex flex-col gap-5">
        <KhungCho className="h-8 w-2/3 rounded-lg" />
        <KhungCho className="aspect-video" />
        <DangTai chu="Đang tải bài học…" />
      </div>
    );
  }
  const duLieu = chiTiet.data;
  if (!duLieu) return <Loi tieuDe="Không tải được bài học" chiTiet={chiTiet.loi} thuLai={chiTiet.taiLai} />;

  const { bai } = duLieu;
  const v = bai.video_url ? phanTichVideo(bai.video_url) : null;
  const noiDung = bai.noi_dung ? boTieuDeTrung(bai.noi_dung, bai.tieu_de) : "";
  const muc = loTrinh.data?.baiHoc.find(b => b.id === bai.id);
  const tt = muc ? trangThaiBaiLyno(muc) : null;
  // Co bai kiem tra dang bat -> phai dat; khong co -> danh dau da hoc (luat CRM)
  const q = quiz.data && quiz.data.quiz.bat ? quiz.data : null;

  async function danhDauDaHoc() {
    const ok = await daDoc.chay(async () => {
      await daoTaoApi.baiLynoDaDoc(bai.id);
      return true;
    });
    if (ok) lamMoiBaiLyno(bai.id);
  }

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <Link href="/hoc-vien/bai-hoc-lyno" className={cn(lopLienKet, "inline-flex min-h-9 items-center self-start text-sm")}>
        ← Bài học Lyno
      </Link>
      <div className="flex flex-col gap-2">
        <h1 className="m-0 text-h1 text-chu">{bai.tieu_de}</h1>
        <div className="flex flex-wrap gap-2">
          {bai.bat_buoc && <Nhan tong="chinh">Bắt buộc</Nhan>}
          {tt && <Nhan tong={tt.tong}>{tt.nhan}</Nhan>}
        </div>
      </div>

      {v &&
        (v.kieu === "lien-ket" ? (
          <a href={v.src} target="_blank" rel="noopener noreferrer" className={cn(lopLienKet, "self-start text-sm")}>
            Mở video bài học →
          </a>
        ) : (
          <VideoNhung v={v} tieuDe={bai.tieu_de} />
        ))}

      <div className={cn(lopThe, "flex min-w-0 flex-col gap-3 p-4 md:p-5")}>
        <Kicker>Nội dung bài học</Kicker>
        {noiDung ? <NoiDungMarkdown md={noiDung} /> : <p className="m-0 text-body-lg text-chu-phu">Nội dung bài học đang được cập nhật.</p>}
      </div>

      {quiz.dangTai ? (
        <DangTai chu="Đang tải bài kiểm tra…" />
      ) : quiz.loi && quiz.data === undefined ? (
        <Loi tieuDe="Không tải được bài kiểm tra" chiTiet={quiz.loi} thuLai={quiz.taiLai} />
      ) : q ? (
        <KhoiQuizLyno key={q.quiz.id} quiz={q} baiId={bai.id} />
      ) : (
        <div className="flex flex-col gap-3">
          {daDoc.loi && <ThongBaoNoiDong kieu="loi">{daDoc.loi}</ThongBaoNoiDong>}
          {duLieu.daDoc ? (
            <ThongBaoNoiDong kieu="thanh-cong">Bạn đã học xong bài này.</ThongBaoNoiDong>
          ) : (
            <Nut onClick={() => void danhDauDaHoc()} dangXuLy={daDoc.dangXuLy} co="lon" className="self-start">
              Đánh dấu đã học
            </Nut>
          )}
        </div>
      )}
    </div>
  );
}
