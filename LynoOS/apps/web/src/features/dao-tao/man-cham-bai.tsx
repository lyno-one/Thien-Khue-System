"use client";

import { NHAN_TRANG_THAI_THUC_HANH } from "@thien-khue/contracts";
import { useState } from "react";
import { HopThoai, KhungCho, Loi, lopLienKet, lopThanhTab, lopThe, Nhan, Nut, OLuaChon, ONhap, OVanBan, ThongBaoNoiDong, TieuDeTrang, Trong } from "@/components/ui";
import { cn } from "@/lib/cn";
import { dinhDangNgayGio } from "@/lib/dinh-dang";
import { useXacThuc } from "@/providers/auth-provider";
import { daoTaoApi } from "./api";
import { lamMoi, useDuLieu, useThaoTac } from "./dung-du-lieu";
import { ThePhienLuyenAi } from "./khoi-luyen-ai";
import { linkHopLe } from "./khoi-thuc-hanh";
import type { BaiThucHanhChoCham, BangChungLuyenAi, TrangThaiThucHanh } from "./kieu";
import { Kicker, NutLoc } from "./thanh-phan";
import { cauThayDoi } from "./tinh-toan";

const SO_DONG = 20;
const LOC: TrangThaiThucHanh[] = ["CHO_CHAM", "CHUA_DAT", "DAT"];
const TONG = { CHO_CHAM: "chinh", DAT: "thanh-cong", CHUA_DAT: "canh-bao" } as const;

/** Bang chung bai LUYEN_AI: phien dat (diem tung ky nang, vi pham, tom tat, link xem lai) */
function BangChungLuyenAiKhoi({ bc, gon = false }: { bc: BangChungLuyenAi; gon?: boolean }) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <span className="text-xs text-chu-phu">
        Ngưỡng đạt {bc.nguong} điểm, không hứa sai chính sách · cập nhật {dinhDangNgayGio(bc.cap_nhat_luc)}
      </span>
      {bc.phien.map(p => (
        <ThePhienLuyenAi key={p.id} phien={p} gon={gon} />
      ))}
    </div>
  );
}

/** Hop thoai cham mot bai: Dat / Chua dat, diem 0..100 (tuy chon), nhan xet (bat buoc khi Chua dat) */
function HopThoaiCham({ bai, dong, xong }: { bai: BaiThucHanhChoCham; dong: () => void; xong: (cau: string) => void }) {
  const [ketQua, setKetQua] = useState<"DAT" | "CHUA_DAT" | null>(null);
  const [diem, setDiem] = useState("");
  const [nhanXet, setNhanXet] = useState("");
  const [loiForm, setLoiForm] = useState<string | null>(null);
  const thaoTac = useThaoTac();

  async function gui() {
    if (!ketQua) return setLoiForm("Chọn kết quả Đạt hoặc Chưa đạt");
    const d = diem.trim() === "" ? undefined : Number(diem);
    if (d !== undefined && (!Number.isInteger(d) || d < 0 || d > 100)) return setLoiForm("Điểm là số nguyên từ 0 đến 100");
    if (ketQua === "CHUA_DAT" && !nhanXet.trim()) return setLoiForm("Chưa đạt cần nhận xét để học viên biết sửa gì");
    setLoiForm(null);
    const kq = await thaoTac.chay(() => daoTaoApi.chamThucHanh(bai.id, { ket_qua: ketQua, diem: d, nhan_xet: nhanXet.trim() || undefined }));
    if (kq) {
      const them = cauThayDoi(kq.thay_doi).map(c => c.replace(/^Bạn (vừa|đã)/, "Học viên $1"));
      xong([`Đã chấm bài của ${bai.hoc_vien_ten}: ${ketQua === "DAT" ? "Đạt" : "Chưa đạt"}.`, ...them].join(" "));
    }
  }

  return (
    <HopThoai
      mo
      dong={dong}
      tieuDe="Chấm bài thực hành"
      moTa={`${bai.hoc_vien_ten} · ${bai.khoa_hoc_ten}`}
      rong="lon"
      chanTrang={
        <>
          <Nut kieu="trong" onClick={dong}>
            Huỷ
          </Nut>
          <Nut onClick={() => void gui()} dangXuLy={thaoTac.dangXuLy}>
            Lưu kết quả
          </Nut>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {bai.yeu_cau_thuc_hanh && (
          <div className="flex flex-col gap-1 rounded-lg bg-be-mat-phu p-4">
            <Kicker>Yêu cầu</Kicker>
            <p className="m-0 text-sm text-chu">{bai.yeu_cau_thuc_hanh}</p>
          </div>
        )}
        {bai.nguon === "LUYEN_AI" && bai.bang_chung && (
          <div className="flex min-w-0 flex-col gap-2">
            <Kicker>Phiên luyện tư vấn với AI đạt</Kicker>
            <BangChungLuyenAiKhoi bc={bai.bang_chung} />
          </div>
        )}
        <div className="flex min-w-0 flex-col gap-1 text-sm">
          <Kicker>{bai.nguon === "LUYEN_AI" ? "Tóm tắt" : "Bài nộp"}</Kicker>
          <span className="text-chu-phu">Nộp lúc {dinhDangNgayGio(bai.nop_luc)}</span>
          {linkHopLe(bai.link) && (
            <a href={bai.link} target="_blank" rel="noopener noreferrer" className={cn(lopLienKet, "break-all")}>
              {bai.link}
            </a>
          )}
          {linkHopLe(bai.tep_url) && (
            <a href={bai.tep_url} target="_blank" rel="noopener noreferrer" className={cn(lopLienKet, "break-all")}>
              Tệp đính kèm
            </a>
          )}
          {bai.mo_ta && <p className="m-0 whitespace-pre-line break-words text-chu-phu">{bai.mo_ta}</p>}
        </div>

        <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
          <legend className="mb-2 text-sm font-semibold text-chu">Kết quả <span className="text-loi">*</span></legend>
          <div className="grid grid-cols-2 gap-3">
            <OLuaChon daChon={ketQua === "DAT"} onClick={() => setKetQua("DAT")}>
              Đạt
            </OLuaChon>
            <OLuaChon daChon={ketQua === "CHUA_DAT"} onClick={() => setKetQua("CHUA_DAT")}>
              Chưa đạt
            </OLuaChon>
          </div>
        </fieldset>
        <ONhap
          nhan="Điểm (0–100)"
          type="number"
          inputMode="numeric"
          min={0}
          max={100}
          step={1}
          value={diem}
          onChange={e => setDiem(e.target.value)}
          goiY="Không bắt buộc"
          lopKhung="max-w-[200px]"
        />
        <OVanBan
          nhan="Nhận xét"
          batBuoc={ketQua === "CHUA_DAT"}
          rows={4}
          maxLength={2000}
          value={nhanXet}
          onChange={e => setNhanXet(e.target.value)}
          goiY="Học viên sẽ thấy nhận xét này. Nhận xét được lưu làm bằng chứng cấp quyền."
        />
        {(loiForm || thaoTac.loi) && <ThongBaoNoiDong kieu="loi">{loiForm ?? thaoTac.loi}</ThongBaoNoiDong>}
      </div>
    </HopThoai>
  );
}

/** Mentor / quan ly cham bai thuc hanh (/hoc-vien/cham-bai). Khong tu cham bai cua minh. */
export function ManChamBai() {
  const { nguoiDung } = useXacThuc();
  const [loc, setLoc] = useState<TrangThaiThucHanh>("CHO_CHAM");
  const [trang, setTrang] = useState(1);
  const [dangCham, setDangCham] = useState<BaiThucHanhChoCham | null>(null);
  const [thongBao, setThongBao] = useState<string | null>(null);

  const khoa = `dao-tao:thuc-hanh:${loc}:${trang}`;
  const { data, dangTai, loi, taiLai } = useDuLieu(khoa, () => daoTaoApi.dsThucHanh({ trang_thai: loc, trang, so_dong: SO_DONG }));
  const ds = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="flex flex-col gap-6 [&>header]:mb-0">
      <TieuDeTrang
        kicker="Mentor"
        tieuDe="Chấm bài thực hành"
        moTa="Bài thực hành đạt là điều kiện để học viên hoàn thành khóa, được cấp quyền SKU và kích hoạt vai trò. Bạn không thể chấm bài của chính mình."
      />

      <div className={cn(lopThanhTab, "self-start")} role="group" aria-label="Lọc trạng thái">
        {LOC.map(l => (
          <NutLoc
            key={l}
            dangChon={loc === l}
            onClick={() => {
              setLoc(l);
              setTrang(1);
            }}
          >
            {NHAN_TRANG_THAI_THUC_HANH[l]}
          </NutLoc>
        ))}
      </div>

      {thongBao && <ThongBaoNoiDong kieu="thanh-cong">{thongBao}</ThongBaoNoiDong>}

      {dangTai ? (
        <div className="flex flex-col gap-4">
          {[0, 1, 2].map(i => (
            <KhungCho key={i} className="h-[152px]" />
          ))}
        </div>
      ) : !data ? (
        <Loi tieuDe="Không tải được danh sách bài" chiTiet={loi} thuLai={taiLai} />
      ) : !ds.length ? (
        <Trong
          tieuDe={loc === "CHO_CHAM" ? "Không có bài chờ chấm" : "Chưa có bài nào"}
          moTa={loc === "CHO_CHAM" ? "Bài thực hành học viên nộp sẽ hiện ở đây." : undefined}
        />
      ) : (
        <div className="flex flex-col gap-4">
          {ds.map(b => {
            const cuaToi = b.ho_so_id === nguoiDung?.id;
            return (
              <article key={b.id} className={cn(lopThe, "flex min-w-0 flex-col gap-3 p-4 md:p-5")}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-col gap-1">
                    <span className="text-h3 text-chu">{b.hoc_vien_ten}</span>
                    <span className="break-all text-xs text-chu-phu">{b.hoc_vien_email ?? "—"}</span>
                  </div>
                  <Nhan tong={TONG[b.trang_thai]}>{NHAN_TRANG_THAI_THUC_HANH[b.trang_thai]}</Nhan>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-sm text-chu-phu">
                  <span>
                    <span className="font-semibold text-chu">{b.khoa_hoc_ten}</span> · Nộp {dinhDangNgayGio(b.nop_luc)}
                  </span>
                  {b.nguon === "LUYEN_AI" && <Nhan tong="trung-tinh">Luyện tư vấn với AI</Nhan>}
                </div>
                {linkHopLe(b.link) && (
                  <a href={b.link} target="_blank" rel="noopener noreferrer" className={cn(lopLienKet, "break-all text-sm")}>
                    {b.link}
                  </a>
                )}
                {b.mo_ta && <p className="m-0 line-clamp-3 whitespace-pre-line break-words text-sm text-chu-phu">{b.mo_ta}</p>}
                {b.nguon === "LUYEN_AI" && b.bang_chung && (
                  <details className="group text-sm">
                    <summary className={cn(lopLienKet, "cursor-pointer list-none")}>Xem điểm từng kỹ năng ({b.bang_chung.phien.length} phiên)</summary>
                    <div className="mt-3">
                      <BangChungLuyenAiKhoi bc={b.bang_chung} gon />
                    </div>
                  </details>
                )}
                {b.trang_thai !== "CHO_CHAM" && (
                  <div className="rounded-lg bg-be-mat-phu p-3 text-sm text-chu">
                    <span className="font-semibold">
                      {b.nguoi_cham_ten ?? "Mentor"}
                      {b.diem != null ? ` · ${b.diem} điểm` : ""}
                      {b.cham_luc ? ` · ${dinhDangNgayGio(b.cham_luc)}` : ""}
                    </span>
                    {b.nhan_xet && <p className="m-0 mt-1 whitespace-pre-line break-words text-chu-phu">{b.nhan_xet}</p>}
                  </div>
                )}
                {b.trang_thai === "CHO_CHAM" &&
                  (cuaToi ? (
                    <span className="text-xs text-chu-mo">Bài của bạn — cần mentor khác chấm.</span>
                  ) : (
                    <Nut
                      co="nho"
                      className="self-start"
                      onClick={() => {
                        setThongBao(null);
                        setDangCham(b);
                      }}
                    >
                      Chấm bài
                    </Nut>
                  ))}
              </article>
            );
          })}

          {meta && meta.tong_trang > 1 && (
            <nav aria-label="Phân trang" className="flex flex-wrap items-center gap-3">
              <Nut kieu="vien" co="nho" disabled={trang <= 1} onClick={() => setTrang(t => t - 1)}>
                ← Trước
              </Nut>
              <span className="text-sm text-chu-phu">
                Trang {meta.trang}/{meta.tong_trang} · {meta.tong} bài
              </span>
              <Nut kieu="vien" co="nho" disabled={trang >= meta.tong_trang} onClick={() => setTrang(t => t + 1)}>
                Sau →
              </Nut>
            </nav>
          )}
        </div>
      )}

      {dangCham && (
        <HopThoaiCham
          bai={dangCham}
          dong={() => setDangCham(null)}
          xong={cau => {
            setDangCham(null);
            setThongBao(cau);
            lamMoi("dao-tao:thuc-hanh:*");
          }}
        />
      )}
    </div>
  );
}
