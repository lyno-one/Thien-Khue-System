"use client";

import type { CauHinhHang, HangCuaToi, HanhPhucCuaToi, UuDaiCuaToi } from "@thien-khue/contracts";
import { MA_LOI_SDT_CHUA_XAC_MINH, NHAN_HANG_THANH_VIEN, SO_LAN_MUA_KH_HANH_PHUC } from "@thien-khue/contracts";
import { useState } from "react";
import { DangTai, Loi, lopChip, lopKhungDs, lopKicker, Nhan, Nut, NutLienKet, ONhap, OVanBan, ThongBaoNoiDong, Trong } from "@/components/ui";
import { LoiApi } from "@/lib/api";
import { cn } from "@/lib/cn";
import { dinhDangNgay, dinhDangTien } from "@/lib/dinh-dang";
import { useXacThuc } from "@/providers/auth-provider";
import { apiKdt, useTai, useThaoTac } from "./api";
import { CHU_KHU, DiemCham, lopHang, moTaGiam, NhanCapPhat, NhanHangApDung, NhanMoi, tienGon } from "./hien-thi";

/*
 * Trang thanh vien cua khach (Main.dc.html — trang vai tro VIP / Than thien / Hanh phuc CEO):
 * hero kicker + tieu de lon, khoi quyen loi danh so 01/02/03, the uu dai ben phai.
 * Hang luon tinh lai tu don hop le CRM (don hoan / huy khong tinh).
 */

const NOI_DUNG_HERO = {
  VIP: {
    kicker: "Thành viên VIP",
    tieuDe: "Đặc quyền dành cho người phụ nữ bản lĩnh",
    loiDan: "Cảm ơn bạn đã gắn bó lâu năm với LYNO và khăn lụa Thiên Khuê: tư vấn riêng, ưu tiên bộ sưu tập mới, voucher và quà tặng từ đối tác."
  },
  THAN_THIET: {
    kicker: "Thành viên Thân thiết",
    tieuDe: "Nơi những người yêu sự tinh tế gặp nhau",
    loiDan: "Bạn đang là thành viên Thân thiết — ưu đãi riêng trên mỗi đơn và còn một chặng nữa để trở thành VIP."
  },
  THUONG: {
    kicker: "Thành viên",
    tieuDe: "Đồng hành cùng LYNO & Thiên Khuê",
    loiDan: "Mỗi đơn mua hợp lệ đều được tích luỹ. Đạt ngưỡng là tự động lên hạng — không cần đăng ký."
  }
} as const;

/** SDT ho so chua xac minh: API /toi/* tra 403 SDT_CHUA_XAC_MINH — chi hien chinh sach hang cong khai + huong dan */
interface ChuaXacMinh {
  chua_xac_minh: string;
  cau_hinh: CauHinhHang[];
}

async function taiHangCuaToi(): Promise<HangCuaToi | ChuaXacMinh> {
  try {
    return await apiKdt.hangCuaToi();
  } catch (e) {
    if (e instanceof LoiApi && e.code === MA_LOI_SDT_CHUA_XAC_MINH) return { chua_xac_minh: e.message, cau_hinh: await apiKdt.cauHinh() };
    throw e;
  }
}

export function TrangThanhVien() {
  const hang = useTai(taiHangCuaToi);

  if (hang.dangTai && !hang.data) return <DangTai />;
  if (hang.loi || !hang.data) return <Loi chiTiet={hang.loi} thuLai={() => void hang.taiLai()} />;
  if ("chua_xac_minh" in hang.data) return <TrangChuaXacMinh d={hang.data} />;
  return <TrangDaXacMinh h={hang.data} />;
}

function LienKetNhanVien() {
  const { coVai } = useXacThuc();
  const laNhanVien = coVai("QUAN_LY", "CSKH", "SALE");
  if (!laNhanVien && !coVai("DOI_TAC")) return null;
  return (
    <div className="mb-6 flex flex-wrap gap-3">
      {laNhanVien && (
        <NutLienKet href="/thanh-vien/quan-ly" kieu="vien" co="nho">
          Quản lý thành viên & đối tác
        </NutLienKet>
      )}
      {coVai("DOI_TAC") && (
        <NutLienKet href="/thanh-vien/doi-tac" kieu="vien" co="nho">
          Cổng đối tác
        </NutLienKet>
      )}
    </div>
  );
}

function HeroThanhVien({ hang }: { hang: HangCuaToi["hang"] }) {
  const hero = NOI_DUNG_HERO[hang ?? "THUONG"];
  return (
    <section className="tk-up grid gap-4 border-b border-vien pb-6 md:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] md:items-end md:gap-12">
      <div className="flex flex-col gap-3">
        <span className={cn(lopChip, lopHang(hang), "self-start")}>{hero.kicker}</span>
        <h1 className="m-0 text-h1 text-chu">{hero.tieuDe}</h1>
      </div>
      <p className="m-0 text-body text-chu-phu">{hero.loiDan}</p>
    </section>
  );
}

/** Chua xac minh SDT: khong goi API du lieu khach (uu dai, KH hanh phuc) — chi chinh sach chung */
function TrangChuaXacMinh({ d }: { d: ChuaXacMinh }) {
  return (
    <div className="-mt-2 flex flex-col">
      <LienKetNhanVien />
      <HeroThanhVien hang={null} />
      <ThongBaoNoiDong kieu="canh-bao" className="mt-6">
        {d.chua_xac_minh}{" "}
        <NutLienKet href="/tai-khoan" kieu="vien" co="nho" className="ml-2">
          Xem tài khoản
        </NutLienKet>
      </ThongBaoNoiDong>
      <section className="pb-12 pt-8">
        <KhoiQuyenLoi cauHinh={d.cau_hinh} hangHienTai={null} />
      </section>
    </div>
  );
}

function TrangDaXacMinh({ h }: { h: HangCuaToi }) {
  const uuDai = useTai(apiKdt.uuDaiCuaToi);
  const hanhPhuc = useTai(apiKdt.hanhPhucCuaToi);

  return (
    <div className="-mt-2 flex flex-col">
      <LienKetNhanVien />
      <HeroThanhVien hang={h.hang} />

      {!h.co_sdt && (
        <ThongBaoNoiDong kieu="canh-bao" className="mt-6">
          Hồ sơ của bạn chưa có số điện thoại mua hàng nên chưa nối được với lịch sử đơn.{" "}
          <NutLienKet href="/tai-khoan" kieu="vien" co="nho" className="ml-2">
            Cập nhật số điện thoại
          </NutLienKet>
        </ThongBaoNoiDong>
      )}

      <TheHang h={h} />

      <section className="grid gap-8 pb-12 pt-8 md:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] md:gap-12">
        <KhoiQuyenLoi cauHinh={h.cau_hinh} hangHienTai={h.hang} />
        <TheUuDai uuDai={uuDai.data} dangTai={uuDai.dangTai} loi={uuDai.loi} />
      </section>

      <KhoiHanhPhuc data={hanhPhuc.data} dangTai={hanhPhuc.dangTai} loi={hanhPhuc.loi} taiLai={hanhPhuc.taiLai} />

      <KhoiDonTinhHang h={h} />
    </div>
  );
}

// ------------------------------------------------------------------ the hang + tien do

function TheHang({ h }: { h: HangCuaToi }) {
  const tiep = h.hang_tiep_theo;
  const nguongHienTai = h.cau_hinh.find(c => c.hang === h.hang)?.nguong_tich_luy ?? 0;
  const phanTram = tiep ? Math.min(100, Math.max(0, ((h.tong_mua_hop_le - nguongHienTai) / Math.max(1, tiep.nguong_tich_luy - nguongHienTai)) * 100)) : 100;
  return (
    <section className="tk-up tk-d1 mt-6 grid gap-6 rounded-xl border border-chinh/20 bg-chinh-nhat p-6 text-chu md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:p-8">
      <div className="flex flex-col gap-2">
        <span className={lopKicker}>Hạng hiện tại</span>
        <span className={cn("so text-so", h.hang ? "text-chinh-dam" : "text-chu")}>{h.ten_hang}</span>
        <span className="text-sm text-chu-phu">
          {h.giam_gia_phan_tram > 0 ? `Giảm ${h.giam_gia_phan_tram}% mỗi đơn` : "Chưa có ưu đãi hạng"}
          {h.quyen_loi ? ` · ${h.quyen_loi}` : ""}
        </span>
      </div>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-col gap-1">
            <span className={lopKicker}>Tích luỹ hợp lệ</span>
            <span className="so text-so">{dinhDangTien(h.tong_mua_hop_le)}</span>
          </div>
          <span className="text-sm text-chu-phu">
            {h.so_don_hop_le} đơn hợp lệ{h.lan_mua_cuoi ? ` · mua gần nhất ${dinhDangNgay(h.lan_mua_cuoi)}` : ""}
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-be-mat" role="progressbar" aria-valuenow={Math.round(phanTram)} aria-valuemin={0} aria-valuemax={100}>
          <div className={cn("h-full rounded-full transition-all duration-vua", tiep ? "bg-chinh" : "bg-thanh-cong")} style={{ width: `${phanTram}%` }} />
        </div>
        <span className="text-sm text-chu-phu">
          {tiep ? (
            <>
              Còn <strong className="text-chu">{dinhDangTien(tiep.con_thieu)}</strong> để lên hạng <strong className="text-chu">{tiep.ten}</strong> (từ {tienGon(tiep.nguong_tich_luy)}).
            </>
          ) : (
            "Bạn đang ở hạng cao nhất."
          )}
        </span>
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ quyen loi (danh so 01/02/03)

function KhoiQuyenLoi({ cauHinh, hangHienTai }: { cauHinh: CauHinhHang[]; hangHienTai: HangCuaToi["hang"] }) {
  const ds = cauHinh.filter(c => c.bat);
  return (
    <div className="flex flex-col">
      <h2 className="m-0 mb-4 text-h2 text-chu">Quyền lợi thành viên</h2>
      {ds.map((c, i) => {
        const dangO = c.hang === hangHienTai;
        return (
          <div key={c.id} className="grid grid-cols-[48px_minmax(0,1fr)] gap-4 border-t border-vien py-5 md:grid-cols-[64px_minmax(0,1fr)]">
            <span className={cn("so text-so", c.hang === "VIP" ? CHU_KHU.vip : CHU_KHU.thanThien)}>
              {String(i + 1).padStart(2, "0")}
            </span>
            <div className="flex flex-col gap-1">
              <span className="flex flex-wrap items-center gap-2 text-h3 text-chu">
                {c.ten} — từ {tienGon(c.nguong_tich_luy)}
                {dangO && <Nhan tong="chinh">Hạng của bạn</Nhan>}
              </span>
              <span className="text-body text-chu-phu">
                Giảm {c.giam_gia_phan_tram}% trên mỗi đơn{c.quyen_loi ? `. ${c.quyen_loi}` : ""}
                {c.hang === "VIP" && !c.quyen_loi ? ". Voucher và quà tặng từ đối tác chiến lược." : ""}
              </span>
            </div>
          </div>
        );
      })}
      <div className="grid grid-cols-[48px_minmax(0,1fr)] gap-4 border-t border-vien py-5 md:grid-cols-[64px_minmax(0,1fr)]">
        <span className={cn("so text-so", CHU_KHU.hanhPhuc)}>
          {String(ds.length + 1).padStart(2, "0")}
        </span>
        <div className="flex flex-col gap-1">
          <span className="text-h3 text-chu">Khách hàng hạnh phúc — từ {SO_LAN_MUA_KH_HANH_PHUC} lần mua</span>
          <span className="text-body text-chu-phu">Mời mua sớm mẫu thử và góp ý size, chất liệu, kiểu dáng. Hoàn toàn tự nguyện.</span>
        </div>
      </div>
      <div className="border-t border-vien-dam pt-4 text-body text-chu-phu">
        Tích luỹ tính từ đơn mua hợp lệ trên hệ thống bán hàng. Đơn huỷ, đơn hoàn và đơn đổi trả không được tính — hạng tự cập nhật khi có thay đổi.
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ uu dai (the trang ben phai)

function TheUuDai({ uuDai, dangTai, loi }: { uuDai?: UuDaiCuaToi; dangTai: boolean; loi: string | null }) {
  return (
    <div className="flex flex-col gap-5 self-start rounded-xl border border-vien bg-be-mat p-6">
      <div className="flex flex-col gap-2">
        <h2 className="m-0 text-h2 text-chu">Ưu đãi của bạn</h2>
        <p className="m-0 text-sm leading-relaxed text-chu-phu">Voucher và quà tặng đối tác đã được Thiên Khuê thẩm định, theo hạng thành viên.</p>
      </div>
      {dangTai && !uuDai ? (
        <DangTai />
      ) : loi ? (
        <p className="m-0 text-sm text-loi">{loi}</p>
      ) : !uuDai || (!uuDai.voucher.length && !uuDai.qua_tang.length && !uuDai.da_cap.length) ? (
        <p className="m-0 text-sm text-chu-phu">{uuDai?.hang ? "Chưa có ưu đãi mới cho hạng của bạn." : "Lên hạng Thân thiết để nhận voucher và quà tặng đối tác."}</p>
      ) : (
        <>
          {uuDai.da_cap.length > 0 && (
            <div className="flex flex-col gap-3">
              <span className="text-xs uppercase tracking-[0.04em] text-chu-mo">Đã cấp cho bạn</span>
              {uuDai.da_cap.map(c => (
                <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-vien pb-3">
                  <span className="flex flex-col">
                    <span className="text-h4">{c.ten_uu_dai ?? "Ưu đãi"}</span>
                    {c.ma_voucher && <code className="text-sm font-semibold text-chinh-dam">{c.ma_voucher}</code>}
                  </span>
                  <NhanCapPhat tt={c.trang_thai} />
                </div>
              ))}
            </div>
          )}
          {uuDai.voucher.length > 0 && (
            <div className="flex flex-col gap-3">
              <span className="text-xs uppercase tracking-[0.04em] text-chu-mo">Voucher</span>
              {uuDai.voucher.map(v => (
                <div key={v.id} className="flex flex-col gap-1 rounded-lg border border-dashed border-vien-dam p-4">
                  <span className="flex flex-wrap items-center justify-between gap-2">
                    <strong className="text-h4">{v.ten}</strong>
                    <span className="text-h3 text-chinh-dam">{moTaGiam(v.loai_giam, v.gia_tri)}</span>
                  </span>
                  <span className="text-sm text-chu-phu">
                    {v.ten_doi_tac ? `Từ ${v.ten_doi_tac} · ` : ""}
                    {v.don_toi_thieu ? `Đơn từ ${dinhDangTien(v.don_toi_thieu)} · ` : ""}
                    {v.het_han ? `HSD ${dinhDangNgay(v.het_han)}` : "Không giới hạn thời gian"}
                  </span>
                </div>
              ))}
            </div>
          )}
          {uuDai.qua_tang.length > 0 && (
            <div className="flex flex-col gap-3">
              <span className="text-xs uppercase tracking-[0.04em] text-chu-mo">Quà tặng đối tác</span>
              {uuDai.qua_tang.map(q => (
                <div key={q.id} className="flex gap-4 border-b border-vien pb-3">
                  {q.hinh_anh && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={q.hinh_anh} alt="" className="h-16 w-16 shrink-0 rounded-lg object-cover" />
                  )}
                  <span className="flex min-w-0 flex-col gap-1">
                    <strong className="text-h4">{q.ten}</strong>
                    {q.mo_ta && <span className="text-sm leading-relaxed text-chu-phu">{q.mo_ta}</span>}
                    <span className="flex flex-wrap items-center gap-2 text-xs text-chu-phu">
                      {q.ten_doi_tac && <span>{q.ten_doi_tac}</span>}
                      <NhanHangApDung ds={q.hang_ap_dung} />
                    </span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
      <p className="m-0 text-xs text-chu-mo">Liên hệ CSKH để nhận quà hoặc áp mã khi đặt đơn.</p>
    </div>
  );
}

// ------------------------------------------------------------------ khach hang hanh phuc

function KhoiHanhPhuc({ data, dangTai, loi, taiLai }: { data?: HanhPhucCuaToi; dangTai: boolean; loi: string | null; taiLai: () => Promise<void> }) {
  const tt = useThaoTac();
  if (dangTai && !data) return null;
  if (loi) return <Loi className="mb-12" tieuDe="Không tải được chương trình Khách hàng hạnh phúc" chiTiet={loi} thuLai={() => void taiLai()} />;
  if (!data || !data.co_sdt) return null;

  const moi = data.loi_moi;
  const dangThamGia = moi && ["THAM_GIA", "DA_GUI_MAU", "DA_PHAN_HOI"].includes(moi.trang_thai);
  const daKetThuc = moi && (moi.trang_thai === "TU_CHOI" || moi.trang_thai === "ROI_CHUONG_TRINH");
  const traLoi = async (thamGia: boolean) => {
    if (await tt.chay(() => apiKdt.traLoiMoi(thamGia))) await taiLai();
  };

  return (
    <section className="tk-up mb-12 overflow-hidden rounded-xl border border-vien bg-be-mat">
      <div className="flex flex-col gap-3 border-b border-chinh/20 bg-chinh-nhat p-6 md:p-8">
        <span className={cn(lopChip, "self-start bg-be-mat text-chinh-dam")}>Khách hàng hạnh phúc</span>
        <h2 className="m-0 text-h1 text-chu">Cùng chúng tôi tạo ra mẫu tiếp theo</h2>
        <p className="m-0 max-w-[680px] text-body text-chu-phu">
          Dành cho khách từ {SO_LAN_MUA_KH_HANH_PHUC} lần mua hợp lệ: mua sớm mẫu thử, góp ý riêng về size, chất liệu, kiểu dáng. Tham gia hoàn toàn tự nguyện, có thể rời
          bất cứ lúc nào.
        </p>
      </div>
      <div className="flex flex-col gap-6 p-6 md:p-8">
        {tt.loi && <ThongBaoNoiDong kieu="loi">{tt.loi}</ThongBaoNoiDong>}

        {!moi && !data.du_dieu_kien && (
          <p className="m-0 text-body-lg text-chu-phu">
            Bạn đã có <strong>{data.so_lan_mua_hop_le}</strong> lần mua hợp lệ — còn {Math.max(0, SO_LAN_MUA_KH_HANH_PHUC - data.so_lan_mua_hop_le)} lần nữa để nhận lời
            mời.
          </p>
        )}

        {!moi && data.du_dieu_kien && (
          <div className="flex flex-col gap-4">
            <p className="m-0 text-body-lg text-chu-phu">Bạn đã đủ điều kiện ({data.so_lan_mua_hop_le} lần mua hợp lệ). Bạn có muốn tham gia không?</p>
            <div className="flex flex-wrap gap-3">
              <Nut onClick={() => void traLoi(true)} dangXuLy={tt.dangXuLy}>
                Tham gia chương trình
              </Nut>
            </div>
          </div>
        )}

        {moi && (
          <div className="flex flex-wrap items-center gap-3 text-sm text-chu-phu">
            Trạng thái: <NhanMoi tt={moi.trang_thai} />
            <span>· mời ngày {dinhDangNgay(moi.moi_luc)}</span>
          </div>
        )}

        {moi?.trang_thai === "DA_MOI" && (
          <div className="flex flex-wrap gap-3">
            <Nut onClick={() => void traLoi(true)} dangXuLy={tt.dangXuLy}>
              Đồng ý tham gia
            </Nut>
            <Nut kieu="vien" onClick={() => void traLoi(false)} disabled={tt.dangXuLy}>
              Không, cảm ơn
            </Nut>
          </div>
        )}

        {daKetThuc && data.du_dieu_kien && (
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-chu-phu">Bạn đã không tham gia. Nếu đổi ý, bạn có thể tham gia lại.</span>
            <Nut kieu="vien" co="nho" onClick={() => void traLoi(true)} dangXuLy={tt.dangXuLy}>
              Tham gia lại
            </Nut>
          </div>
        )}

        {dangThamGia && moi && (
          <>
            <DongYHinh dongY={moi.dong_y_dung_hinh} luc={moi.dong_y_dung_hinh_luc} taiLai={taiLai} />
            <FormPhanHoi taiLai={taiLai} />
            {data.phan_hoi.length > 0 && (
              <div className="flex flex-col gap-3">
                <h3 className="m-0 text-h3">Góp ý đã gửi</h3>
                {data.phan_hoi.map(p => (
                  <div key={p.id} className="flex flex-col gap-2 border-t border-vien pt-3">
                    <span className="flex flex-wrap items-center gap-3 text-sm text-chu-phu">
                      {p.ma_mau && <Nhan tong="chinh">{p.ma_mau}</Nhan>}
                      {dinhDangNgay(p.created_at)}
                      {p.hinh_anh.length > 0 && <span>{p.cho_phep_dung_hinh ? "Cho phép dùng hình" : "Hình chỉ dùng nội bộ"}</span>}
                    </span>
                    <span className="flex flex-wrap gap-4">
                      <DiemCham nhan="Size" diem={p.diem_size} />
                      <DiemCham nhan="Chất liệu" diem={p.diem_chat_lieu} />
                      <DiemCham nhan="Kiểu dáng" diem={p.diem_kieu_dang} />
                    </span>
                    <p className="m-0 text-sm leading-relaxed">{p.noi_dung}</p>
                  </div>
                ))}
              </div>
            )}
            <div>
              <Nut kieu="trong" co="nho" onClick={() => void traLoi(false)} disabled={tt.dangXuLy}>
                Rời chương trình
              </Nut>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

/** Co dong y dung hinh — RIENG voi viec tham gia, mac dinh tat */
function DongYHinh({ dongY, luc, taiLai }: { dongY: boolean; luc: string | null; taiLai: () => Promise<void> }) {
  const tt = useThaoTac();
  const doi = async () => {
    if (await tt.chay(() => apiKdt.dongYHinh(!dongY))) await taiLai();
  };
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-vien bg-be-mat-phu p-5">
      <label className="flex cursor-pointer items-start gap-3">
        <input type="checkbox" checked={dongY} onChange={() => void doi()} disabled={tt.dangXuLy} className="mt-1 h-5 w-5 shrink-0 accent-chinh" />
        <span className="flex flex-col gap-1">
          <span className="text-h4">Đồng ý cho LYNO & Thiên Khuê dùng hình ảnh của tôi để truyền thông</span>
          <span className="text-sm leading-relaxed text-chu-phu">
            Không bắt buộc và tách riêng với việc tham gia. Mặc định là không đồng ý; bạn có thể rút lại bất cứ lúc nào.
            {dongY && luc ? ` Đã đồng ý ngày ${dinhDangNgay(luc)}.` : ""}
          </span>
        </span>
      </label>
      {tt.loi && <p className="m-0 text-sm text-loi">{tt.loi}</p>}
    </div>
  );
}

function ChonDiem({ nhan, giaTri, doi }: { nhan: string; giaTri: number | null; doi: (v: number | null) => void }) {
  return (
    <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
      <legend className="mb-2 text-sm font-semibold text-chu">{nhan}</legend>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map(d => (
          <button
            key={d}
            type="button"
            aria-pressed={giaTri === d}
            onClick={() => doi(giaTri === d ? null : d)}
            className={cn(
              "h-11 w-11 rounded-lg border text-sm font-semibold transition-colors duration-nhanh sm:h-9 sm:w-9",
              giaTri === d ? "border-chinh bg-chinh text-tren-chinh" : "border-vien-dam bg-be-mat text-chu hover:border-chinh/40 hover:bg-chinh-nhat"
            )}
          >
            {d}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function FormPhanHoi({ taiLai }: { taiLai: () => Promise<void> }) {
  const tt = useThaoTac();
  const [maMau, setMaMau] = useState("");
  const [size, setSize] = useState<number | null>(null);
  const [chatLieu, setChatLieu] = useState<number | null>(null);
  const [kieuDang, setKieuDang] = useState<number | null>(null);
  const [noiDung, setNoiDung] = useState("");
  const [hinh, setHinh] = useState("");
  const [choPhep, setChoPhep] = useState(false);
  const [daGui, setDaGui] = useState(false);

  const gui = async (e: React.FormEvent) => {
    e.preventDefault();
    const hinhAnh = hinh
      .split(/\s+/)
      .map(s => s.trim())
      .filter(Boolean);
    const kq = await tt.chay(() =>
      apiKdt.guiPhanHoi({
        ma_mau: maMau.trim() || null,
        diem_size: size,
        diem_chat_lieu: chatLieu,
        diem_kieu_dang: kieuDang,
        noi_dung: noiDung,
        hinh_anh: hinhAnh,
        cho_phep_dung_hinh: choPhep
      })
    );
    if (kq) {
      setMaMau("");
      setSize(null);
      setChatLieu(null);
      setKieuDang(null);
      setNoiDung("");
      setHinh("");
      setChoPhep(false);
      setDaGui(true);
      await taiLai();
    }
  };

  return (
    <form onSubmit={e => void gui(e)} className="flex flex-col gap-5">
      <h3 className="m-0 text-h2">Góp ý mẫu thử</h3>
      {daGui && <ThongBaoNoiDong kieu="thanh-cong">Cảm ơn bạn! Góp ý đã được gửi riêng tới đội sản phẩm.</ThongBaoNoiDong>}
      {tt.loi && <ThongBaoNoiDong kieu="loi">{tt.loi}</ThongBaoNoiDong>}
      <ONhap nhan="Mã mẫu (nếu có)" placeholder="VD: AL01" value={maMau} onChange={e => setMaMau(e.target.value.toUpperCase())} maxLength={40} />
      <div className="grid gap-5 md:grid-cols-3">
        <ChonDiem nhan="Size" giaTri={size} doi={setSize} />
        <ChonDiem nhan="Chất liệu" giaTri={chatLieu} doi={setChatLieu} />
        <ChonDiem nhan="Kiểu dáng" giaTri={kieuDang} doi={setKieuDang} />
      </div>
      <OVanBan nhan="Góp ý của bạn" batBuoc value={noiDung} onChange={e => setNoiDung(e.target.value)} placeholder="Size có vừa không, vải mặc thế nào, kiểu dáng bạn muốn chỉnh…" maxLength={4000} />
      <ONhap nhan="Link hình ảnh (không bắt buộc)" goiY="Mỗi link cách nhau bởi dấu cách." value={hinh} onChange={e => setHinh(e.target.value)} />
      <label className="flex cursor-pointer items-start gap-3 text-sm">
        <input type="checkbox" checked={choPhep} onChange={e => setChoPhep(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-chinh" />
        <span>Cho phép dùng hình của góp ý này để truyền thông (mặc định không)</span>
      </label>
      <div>
        <Nut type="submit" dangXuLy={tt.dangXuLy} disabled={!noiDung.trim()}>
          Gửi góp ý
        </Nut>
      </div>
    </form>
  );
}

// ------------------------------------------------------------------ don tinh hang

function KhoiDonTinhHang({ h }: { h: HangCuaToi }) {
  if (!h.co_sdt) return null;
  return (
    <section className="mb-8 flex flex-col gap-4">
      <h2 className="m-0 text-h2">Đơn gần đây</h2>
      {!h.don_gan_day.length ? (
        <Trong tieuDe="Chưa có đơn hàng" moTa="Đơn mua tại LYNO sẽ hiện ở đây và được tích luỹ vào hạng thành viên." />
      ) : (
        <ul className={cn(lopKhungDs, "m-0 list-none p-0")}>
          {h.don_gan_day.map(d => (
            <li key={d.ma_don} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <span className="flex flex-col">
                <span className="font-semibold">{d.ma_don}</span>
                <span className="text-sm text-chu-phu">{dinhDangNgay(d.created_at)}</span>
              </span>
              <span className="flex items-center gap-3">
                <span className={cn("so text-sm font-semibold", !d.tinh_vao_hang && "text-chu-phu line-through")}>{dinhDangTien(d.tong_tien)}</span>
                {d.tinh_vao_hang ? (
                  <Nhan tong="thanh-cong">Tính vào hạng</Nhan>
                ) : (
                  <Nhan tong="trung-tinh">{d.loai_don === "DOI_TRA" ? "Đổi trả" : d.trang_thai === "hoan" ? "Đã hoàn" : "Đã huỷ"} — không tính</Nhan>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
      <p className="m-0 text-sm text-chu-phu">
        Hạng {h.hang ? NHAN_HANG_THANH_VIEN[h.hang] : "thành viên"} được tính lại mỗi lần bạn mở trang này, theo dữ liệu đơn mới nhất.
      </p>
    </section>
  );
}
