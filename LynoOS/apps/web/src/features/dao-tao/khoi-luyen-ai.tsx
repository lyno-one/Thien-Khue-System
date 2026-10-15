"use client";

import { DANH_SACH_KY_NANG_LUYEN_AI, NHAN_KY_NANG_LUYEN_AI, NHAN_LOAI_LUYEN_AI } from "@thien-khue/contracts";
import { useEffect, useRef, useState } from "react";
import { KhungCho, Loi, lopLienKet, lopThe, Nhan, Nut, ThongBaoNoiDong } from "@/components/ui";
import { thongDiepLoi } from "@/lib/api";
import { cn } from "@/lib/cn";
import { dinhDangNgayGio } from "@/lib/dinh-dang";
import { daoTaoApi } from "./api";
import { KHOA, lamMoi, lamMoiTienDo, useDuLieu } from "./dung-du-lieu";
import { KhoiThucHanh } from "./khoi-thuc-hanh";
import { moSalesTraining } from "./mo-sales-training";
import type { KhoaHocChiTiet, LoaiLuyenAi, PhienLuyenAi, TienDoLoaiLuyenAi, TienDoLuyenAi } from "./kieu";
import { Kicker, ThanhTienDo } from "./thanh-phan";

/*
 * "Luyện tư vấn với AI" (Sales Training) — docs/TICH-HOP-SALES-TRAINING.md.
 * Bam "Bắt đầu luyện": xin phieu (Bearer) roi mo tab moi bang FORM POST tu gui (ma_phieu + access token cua phien
 * Supabase hien tai; KHONG gui refresh token) — token KHONG nam tren URL. Ket qua Sales Training tu gui ve; quay lai tab nay la tai lai tien do.
 * "Xem lại phiên": phieu XEM (han 2 phut) + FORM POST {ma_phieu, access_token} toi <ST>/api/vao-tu-thien-khue/xem.
 */

/** id phien Sales Training la uuid (phien that). Chuoi khac (vd phien gia tu script) = khong co ban ghi ben ST */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Nut "Xem lại phiên trên Sales Training": KHONG dung link tran (tab moi dung cookie ST cu — co the cua nguoi khac -> 404).
 * Xin phieu XEM (chu phien / mentor / quan ly) roi POST form sang ST de ST dang nhap dung nguoi dang bam.
 */
function NutXemPhien({ phien }: { phien: PhienLuyenAi }) {
  const [dangMo, setDangMo] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);
  if (!UUID.test(phien.phien_id_st)) return <span className="text-xs text-chu-mo">Không có bản ghi trên Sales Training</span>;

  function moXem() {
    setLoi(null);
    setDangMo(true);
    // Goi dong bo trong onClick: moSalesTraining mo tab truoc moi await
    moSalesTraining(async s => {
      const phieu = await daoTaoApi.taoPhieuXemLuyenAi(phien.id);
      return { url_vao: phieu.url_vao, truong: { ma_phieu: phieu.ma_phieu, access_token: s.access_token } };
    })
      .catch(e => setLoi(thongDiepLoi(e)))
      .finally(() => setDangMo(false));
  }

  return (
    <div className="flex flex-col gap-2 self-start">
      <button type="button" className={cn(lopLienKet, "cursor-pointer self-start border-0 bg-transparent p-0 text-sm")} disabled={dangMo} onClick={moXem}>
        {dangMo ? "Đang mở Sales Training…" : "Xem lại phiên trên Sales Training →"}
      </button>
      {loi && <ThongBaoNoiDong kieu="loi">{loi}</ThongBaoNoiDong>}
    </div>
  );
}

/** Mot phien luyen: diem tong, 6 ky nang, vi pham, tom tat, link xem lai — dung o trang khoa hoc va trang Cham bai */
export function ThePhienLuyenAi({ phien, gon = false }: { phien: PhienLuyenAi; gon?: boolean }) {
  return (
    <article className="flex min-w-0 flex-col gap-3 rounded-lg border border-vien bg-be-mat p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-col">
          <span className="text-sm font-semibold text-chu">{NHAN_LOAI_LUYEN_AI[phien.loai]}</span>
          <span className="text-xs text-chu-phu">{dinhDangNgayGio(phien.ket_thuc_luc ?? phien.nhan_luc)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="so text-h3 text-chu">{phien.diem_tong}</span>
          <span className="text-xs text-chu-mo">/100</span>
          <Nhan tong={phien.dat ? "thanh-cong" : "canh-bao"}>{phien.dat ? "Đạt" : "Chưa đạt"}</Nhan>
        </div>
      </div>

      <dl className={cn("m-0 grid gap-x-4 gap-y-2", gon ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3")}>
        {DANH_SACH_KY_NANG_LUYEN_AI.map(k => (
          <div key={k} className="flex min-w-0 flex-col gap-1">
            <div className="flex items-baseline justify-between gap-2 text-xs">
              <dt className="truncate text-chu-phu">{NHAN_KY_NANG_LUYEN_AI[k]}</dt>
              <dd className="so m-0 font-semibold text-chu">{phien.diem_ky_nang[k]}</dd>
            </div>
            <ThanhTienDo phanTram={phien.diem_ky_nang[k]} nhan={`${NHAN_KY_NANG_LUYEN_AI[k]}: ${phien.diem_ky_nang[k]} điểm`} />
          </div>
        ))}
      </dl>

      {phien.so_vi_pham > 0 && (
        <div className="flex flex-col gap-1 rounded-lg bg-loi-nhat px-3 py-2 text-sm text-loi">
          <span className="font-semibold">{phien.so_vi_pham} lỗi hứa sai chính sách</span>
          {phien.vi_pham.map((v, i) => (
            <span key={i} className="break-words">
              {v.loai ? <span className="font-medium">{v.loai}: </span> : null}
              {v.trich ? `“${v.trich}”` : null}
            </span>
          ))}
        </div>
      )}

      {phien.tom_tat && <p className="m-0 whitespace-pre-line break-words text-sm text-chu">{phien.tom_tat}</p>}
      {!gon && (phien.diem_manh.length > 0 || phien.can_cai_thien.length > 0) && (
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          {phien.diem_manh.length > 0 && (
            <div className="flex flex-col gap-1">
              <Kicker>Điểm mạnh</Kicker>
              <ul className="m-0 flex list-disc flex-col gap-1 pl-5 text-chu-phu">
                {phien.diem_manh.map((x, i) => (
                  <li key={i}>{x}</li>
                ))}
              </ul>
            </div>
          )}
          {phien.can_cai_thien.length > 0 && (
            <div className="flex flex-col gap-1">
              <Kicker>Cần cải thiện</Kicker>
              <ul className="m-0 flex list-disc flex-col gap-1 pl-5 text-chu-phu">
                {phien.can_cai_thien.map((x, i) => (
                  <li key={i}>{x}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      <NutXemPhien phien={phien} />
    </article>
  );
}

function TheLoai({ td, duocLuyen, dangMo, moLuyen }: { td: TienDoLoaiLuyenAi; duocLuyen: boolean; dangMo: boolean; moLuyen: () => void }) {
  const nhan = td.dat ? (
    <Nhan tong="thanh-cong">Đạt</Nhan>
  ) : td.so_phien ? (
    <Nhan tong="canh-bao">Chưa đạt{td.diem_cao_nhat != null ? ` · cao nhất ${td.diem_cao_nhat}` : ""}</Nhan>
  ) : (
    <Nhan tong="trung-tinh">Chưa luyện</Nhan>
  );
  return (
    <div className={cn(lopThe, "flex min-w-0 flex-col gap-3 p-4")}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <span className="text-body-lg font-semibold text-chu">{td.ten}</span>
        {nhan}
      </div>
      <p className="m-0 text-sm text-chu-phu">
        Cần {td.can} phiên đạt · đã đạt <span className="so font-semibold text-chu">{td.so_dat}</span> · đã luyện <span className="so">{td.so_phien}</span> phiên
      </p>
      <Nut kieu={td.dat ? "vien" : "chinh"} co="nho" className="self-start" disabled={!duocLuyen} dangXuLy={dangMo} onClick={moLuyen}>
        {td.dat || td.so_phien ? "Luyện thêm" : "Bắt đầu luyện"}
      </Nut>
    </div>
  );
}

function NoiDungLuyenAi({ khoa, td, taiLai }: { khoa: KhoaHocChiTiet; td: TienDoLuyenAi; taiLai: () => void }) {
  const [dangMo, setDangMo] = useState<LoaiLuyenAi | null>(null);
  const [loi, setLoi] = useState<string | null>(null);
  const [daMo, setDaMo] = useState(false);
  const yc = td.yeu_cau ?? khoa.yeu_cau_luyen_ai;
  const bai = td.bai_thuc_hanh;

  async function moLuyen(loai: LoaiLuyenAi) {
    setLoi(null);
    setDangMo(loai);
    try {
      // moSalesTraining mo tab ngay (dong bo) roi moi xin phieu va POST form vao dung tab do
      await moSalesTraining(async s => {
        const phieu = await daoTaoApi.taoPhieuLuyenAi({ khoa_hoc_id: khoa.id, loai });
        return { url_vao: phieu.url_vao, truong: { ma_phieu: phieu.ma_phieu, access_token: s.access_token } };
      });
      setDaMo(true);
    } catch (e) {
      setLoi(thongDiepLoi(e));
    } finally {
      setDangMo(null);
    }
  }

  const nhanBai = !bai ? null : bai.trang_thai === "CHO_CHAM" ? (
    <Nhan tong="chinh">Chờ mentor duyệt</Nhan>
  ) : bai.trang_thai === "DAT" ? (
    <Nhan tong="thanh-cong">Đã duyệt đạt</Nhan>
  ) : (
    <Nhan tong="canh-bao">Mentor trả về</Nhan>
  );
  const soDat = td.loai.filter(l => l.dat).length;

  return (
    <section id="luyen-ai" className={cn(lopThe, "flex scroll-mt-24 flex-col gap-4 p-4 md:p-5")}>
      <div id="thuc-hanh" className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <Kicker>Bài thực hành</Kicker>
          <h2 className="m-0 text-h3 text-chu">Luyện tư vấn với AI</h2>
        </div>
        {nhanBai}
      </div>
      <p className="m-0 max-w-[70ch] text-body text-chu">
        Đạt {yc ? `${yc.can.TU_VAN} phiên tư vấn bán hàng và ${yc.can.DOI_TRA} phiên tình huống đổi trả` : "các phiên luyện bắt buộc"}: từ{" "}
        <span className="so font-semibold">{yc?.nguong ?? 80}</span> điểm và không hứa sai chính sách. Sales Training mở ở tab mới, đã đăng nhập sẵn; điểm tự
        gửi về đây. Đủ phiên đạt, bài tự chuyển cho mentor duyệt.
      </p>
      <div className="flex flex-col gap-1">
        <div className="text-xs text-chu-phu">
          <span className="so font-semibold text-chu">{soDat}</span>/{td.loai.length} loại tình huống đã đạt
        </div>
        <ThanhTienDo phanTram={td.loai.length ? (soDat * 100) / td.loai.length : 0} nhan="Tiến độ luyện tư vấn với AI" />
      </div>

      {!td.duoc_luyen && td.ly_do_khong_duoc && <ThongBaoNoiDong kieu="canh-bao">{td.ly_do_khong_duoc}</ThongBaoNoiDong>}
      {bai?.trang_thai === "CHUA_DAT" && (
        <ThongBaoNoiDong kieu="canh-bao">
          Mentor trả về{bai.cham_luc ? ` lúc ${dinhDangNgayGio(bai.cham_luc)}` : ""}: {bai.nhan_xet || "cần luyện thêm"}. Chỉ phiên luyện sau thời điểm này được tính lại.
        </ThongBaoNoiDong>
      )}
      {bai?.trang_thai === "CHO_CHAM" && <ThongBaoNoiDong kieu="thanh-cong">Bạn đã đủ phiên luyện đạt — mentor sẽ xem lại điểm và duyệt.</ThongBaoNoiDong>}
      {daMo && (
        <ThongBaoNoiDong kieu="thong-tin">
          Sales Training đã mở ở tab mới. Luyện xong, quay lại đây để xem điểm.{" "}
          <button type="button" className={cn(lopLienKet, "cursor-pointer border-0 bg-transparent p-0")} onClick={taiLai}>
            Tải lại kết quả
          </button>
        </ThongBaoNoiDong>
      )}
      {loi && <ThongBaoNoiDong kieu="loi">{loi}</ThongBaoNoiDong>}

      <div className="grid gap-3 sm:grid-cols-2">
        {td.loai.map(l => (
          <TheLoai key={l.loai} td={l} duocLuyen={td.duoc_luyen && dangMo === null} dangMo={dangMo === l.loai} moLuyen={() => void moLuyen(l.loai)} />
        ))}
      </div>

      {td.phien.length > 0 && (
        <div className="flex flex-col gap-3">
          <Kicker>Các phiên đã luyện ({td.phien.length})</Kicker>
          {td.phien.map(p => (
            <ThePhienLuyenAi key={p.id} phien={p} />
          ))}
        </div>
      )}
    </section>
  );
}

/**
 * Khoa co yeu_cau_luyen_ai: SALE / CSKH luyen voi AI thay cho nop tay; vai khac (CTV, mentor xem thu...) giu khoi nop tay.
 */
export function KhoiLuyenAi({ khoa }: { khoa: KhoaHocChiTiet }) {
  const { data, loi, dangTai, taiLai } = useDuLieu(KHOA.luyenAi(khoa.id), () => daoTaoApi.luyenAi(khoa.id));

  // Quay lai tab hoc vien sau khi luyen -> tai lai diem (ket qua do Sales Training gui ve server)
  useEffect(() => {
    const khiQuayLai = () => {
      if (document.visibilityState !== "visible") return;
      taiLai();
      lamMoi(KHOA.khoaHoc(khoa.id));
    };
    document.addEventListener("visibilitychange", khiQuayLai);
    return () => document.removeEventListener("visibilitychange", khiQuayLai);
  }, [khoa.id, taiLai]);

  // Bai vua vao CHO_CHAM / duoc duyet (doi so voi lan tai truoc) -> lam moi tien do khoa, lo trinh
  const trangThaiBai = data ? (data.bai_thuc_hanh?.trang_thai ?? "") : null;
  const truoc = useRef<string | null>(null);
  useEffect(() => {
    if (trangThaiBai === null) return;
    if (truoc.current !== null && truoc.current !== trangThaiBai) lamMoiTienDo();
    truoc.current = trangThaiBai;
  }, [trangThaiBai]);

  if (dangTai) return <KhungCho className="h-[280px]" />;
  if (!data) return <Loi tieuDe="Không tải được phần luyện tư vấn với AI" chiTiet={loi} thuLai={taiLai} />;
  if (!data.ap_dung) return <KhoiThucHanh khoa={khoa} />;
  return <NoiDungLuyenAi khoa={khoa} td={data} taiLai={taiLai} />;
}
