"use client";

import { NHAN_TRANG_THAI_THUC_HANH } from "@thien-khue/contracts";
import { useState } from "react";
import { lopLienKet, lopThe, Nhan, Nut, ONhap, OVanBan, ThongBaoNoiDong } from "@/components/ui";
import { cn } from "@/lib/cn";
import { dinhDangNgayGio } from "@/lib/dinh-dang";
import { daoTaoApi } from "./api";
import { lamMoiTienDo, useThaoTac } from "./dung-du-lieu";
import type { KhoaHocChiTiet } from "./kieu";
import { Kicker } from "./thanh-phan";

/** Chi nhan link http(s) — tranh javascript: */
export function linkHopLe(s: string | null | undefined): s is string {
  if (!s) return false;
  try {
    const u = new URL(s);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

/** Bai thuc hanh cua khoa (can_thuc_hanh): yeu cau, bai da nop + nhan xet mentor, form nop / nop lai */
export function KhoiThucHanh({ khoa }: { khoa: KhoaHocChiTiet }) {
  const th = khoa.thuc_hanh[0] ?? null; // moi nhat truoc
  const [moForm, setMoForm] = useState(false);
  const [link, setLink] = useState("");
  const [moTa, setMoTa] = useState("");
  const [loiLink, setLoiLink] = useState<string | null>(null);
  const { dangXuLy, loi, chay } = useThaoTac();
  const [vuaNop, setVuaNop] = useState(false);

  const duocNop = !th || th.trang_thai === "CHUA_DAT";
  const hienForm = duocNop && (moForm || !th);
  const hocXong = khoa.tien_do.so_bai_xong >= khoa.tien_do.so_bai;

  async function nop(e: React.FormEvent) {
    e.preventDefault();
    const l = link.trim();
    if (!l) {
      setLoiLink("Nhập đường dẫn bài làm (bài đăng, video, Google Drive…)");
      return;
    }
    if (!linkHopLe(l)) {
      setLoiLink("Đường dẫn phải bắt đầu bằng https://");
      return;
    }
    setLoiLink(null);
    const kq = await chay(() => daoTaoApi.nopThucHanh(khoa.id, { tieu_de: `Thực hành ${khoa.ten}`, link: l, mo_ta: moTa.trim() || undefined }));
    if (kq) {
      setVuaNop(true);
      setMoForm(false);
      setLink("");
      setMoTa("");
      lamMoiTienDo();
    }
  }

  return (
    <section id="thuc-hanh" className={cn(lopThe, "flex scroll-mt-24 flex-col gap-3 p-4 md:p-5")}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Kicker>Bài thực hành</Kicker>
        {th && (
          <Nhan tong={th.trang_thai === "DAT" ? "thanh-cong" : th.trang_thai === "CHUA_DAT" ? "canh-bao" : "chinh"}>{NHAN_TRANG_THAI_THUC_HANH[th.trang_thai]}</Nhan>
        )}
      </div>
      {khoa.yeu_cau_thuc_hanh && <p className="m-0 max-w-[70ch] text-body-lg text-chu">{khoa.yeu_cau_thuc_hanh}</p>}
      <p className="m-0 text-xs text-chu-mo">Mentor chấm bài; khóa chỉ hoàn thành khi bài thực hành đạt.</p>

      {vuaNop && <ThongBaoNoiDong kieu="thanh-cong">Đã nộp bài thực hành — mentor sẽ chấm và gửi nhận xét cho bạn.</ThongBaoNoiDong>}

      {th && (
        <div className="flex min-w-0 flex-col gap-2 rounded-lg bg-be-mat-phu p-4 text-sm text-chu">
          <div className="text-chu-phu">Nộp lúc {dinhDangNgayGio(th.nop_luc)}</div>
          {linkHopLe(th.link) && (
            <a href={th.link} target="_blank" rel="noopener noreferrer" className={cn(lopLienKet, "break-all")}>
              {th.link}
            </a>
          )}
          {linkHopLe(th.tep_url) && (
            <a href={th.tep_url} target="_blank" rel="noopener noreferrer" className={cn(lopLienKet, "break-all")}>
              Tệp đính kèm
            </a>
          )}
          {th.mo_ta && <p className="m-0 whitespace-pre-line break-words text-chu-phu">{th.mo_ta}</p>}
          {th.trang_thai !== "CHO_CHAM" && (
            <div className="mt-1 flex flex-col gap-1 border-t border-vien pt-3">
              <div className="font-semibold">
                Nhận xét{th.nguoi_cham_ten ? ` của ${th.nguoi_cham_ten}` : " của mentor"}
                {th.diem != null ? ` · ${th.diem} điểm` : ""}
                {th.cham_luc ? <span className="font-normal text-chu-phu"> · {dinhDangNgayGio(th.cham_luc)}</span> : null}
              </div>
              <p className="m-0 whitespace-pre-line break-words text-chu-phu">{th.nhan_xet || "—"}</p>
            </div>
          )}
        </div>
      )}

      {duocNop && th && !moForm && (
        <Nut kieu="vien" co="nho" className="self-start" onClick={() => setMoForm(true)}>
          Nộp lại bài thực hành
        </Nut>
      )}

      {hienForm && (
        <form onSubmit={nop} className="flex flex-col gap-3" noValidate>
          {!hocXong && <p className="m-0 rounded-lg bg-canh-bao-nhat px-3 py-2 text-sm text-canh-bao">Nên hoàn thành các bài học trước khi nộp bài thực hành.</p>}
          <ONhap
            nhan="Đường dẫn bài làm"
            batBuoc
            type="url"
            inputMode="url"
            placeholder="https://…"
            value={link}
            onChange={e => setLink(e.target.value)}
            loi={loiLink}
            goiY="Link bài đăng, video, Google Drive… (đã bật quyền xem)"
          />
          <OVanBan nhan="Mô tả / ghi chú" rows={3} value={moTa} onChange={e => setMoTa(e.target.value)} maxLength={2000} />
          {loi && <ThongBaoNoiDong kieu="loi">{loi}</ThongBaoNoiDong>}
          <div className="flex flex-wrap gap-3">
            <Nut type="submit" dangXuLy={dangXuLy}>
              Nộp bài thực hành
            </Nut>
            {th && (
              <Nut kieu="trong" onClick={() => setMoForm(false)}>
                Huỷ
              </Nut>
            )}
          </div>
        </form>
      )}
    </section>
  );
}
