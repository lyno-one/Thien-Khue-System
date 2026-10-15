"use client";

import { NHAN_TRANG_THAI_QUYEN_SKU } from "@thien-khue/contracts";
import { useState } from "react";
import { KhungCho, Loi, lopThanhTab, lopThe, Nhan, Nut, NutLienKet, ThongBaoNoiDong, TieuDeTrang, Trong } from "@/components/ui";
import { cn } from "@/lib/cn";
import { dinhDangNgay, dinhDangNgayGio } from "@/lib/dinh-dang";
import { daoTaoApi } from "./api";
import { lamMoiTienDo, useThaoTac } from "./dung-du-lieu";
import { useDsKhoaHoc, useQuyenSku } from "./hooks";
import type { KhoaHocTomTat, QuyenSkuCuaToi } from "./kieu";
import { NutLoc, OSoLieu } from "./thanh-phan";

type Loc = "TAT_CA" | "DUOC_BAN" | "CAN_HOC_LAI" | "CHUA_CO";

const TONG_NHAN = { HOAT_DONG: "thanh-cong", CAN_HOC_LAI: "canh-bao", THU_HOI: "loi" } as const;

/** "AL01 · Áo sơ mi" -> "Áo sơ mi" (ma da hien to o tren) */
function tenBoMa(ten: string | null | undefined, ma: string | null | undefined): string | null {
  if (!ten) return null;
  return ma && ten.startsWith(`${ma} · `) ? ten.slice(ma.length + 3) : ten;
}

/** Mot ma da co ban ghi quyen */
function TheQuyen({ q }: { q: QuyenSkuCuaToi }) {
  const thaoTac = useThaoTac();
  const [xong, setXong] = useState(false);
  const bc = q.bang_chung;
  const lyDo = bc?.can_hoc_lai?.ly_do ?? q.ly_do;

  async function xacNhan() {
    const kq = await thaoTac.chay(() => daoTaoApi.xacNhanSku(q.mau_id));
    if (kq) {
      setXong(true);
      lamMoiTienDo();
    }
  }

  return (
    <article className={cn(lopThe, "flex min-w-0 flex-col gap-3 p-4 md:p-5")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="font-mono text-h2 text-chu">{q.ma_mau}</span>
          {q.khoa_hoc_ten && <span className="text-sm text-chu-phu">{tenBoMa(q.khoa_hoc_ten, q.ma_mau)}</span>}
        </div>
        <Nhan tong={TONG_NHAN[q.trang_thai]}>{NHAN_TRANG_THAI_QUYEN_SKU[q.trang_thai]}</Nhan>
      </div>

      {q.trang_thai === "HOAT_DONG" && (
        <p className="m-0 text-sm text-chu-phu">Được tư vấn, lấy mã giới thiệu, nhận chiến dịch và bán mã này.</p>
      )}
      {q.trang_thai === "CAN_HOC_LAI" && (
        <div className="flex flex-col gap-2 rounded-lg border border-canh-bao/30 bg-canh-bao-nhat p-3 text-sm text-canh-bao">
          <span>
            Tài liệu cập nhật lên v{q.phien_ban_hien_hanh ?? "?"} (bạn đạt ở v{q.phien_ban_tai_lieu}) — tạm dừng bán.
            {lyDo ? ` Thay đổi: ${lyDo}` : ""}
          </span>
          <span className="font-semibold">
            {q.yeu_cau_hoc_lai === "THI_LAI" ? "Cần học lại và thi đạt bài kiểm tra." : "Đọc lại tài liệu rồi xác nhận đã nắm thay đổi."}
          </span>
        </div>
      )}
      {q.trang_thai === "THU_HOI" && (
        <p className="m-0 text-sm text-loi">
          Quyền đã thu hồi{q.thu_hoi_luc ? ` ngày ${dinhDangNgay(q.thu_hoi_luc)}` : ""}
          {q.ly_do ? ` — ${q.ly_do}` : ""}. Liên hệ quản lý nếu cần cấp lại.
        </p>
      )}

      <dl className="m-0 grid grid-cols-2 gap-x-4 gap-y-1 border-t border-vien pt-3 text-xs text-chu-phu">
        <dt>Cấp lúc</dt>
        <dd className="m-0 text-chu">{dinhDangNgayGio(q.cap_luc)}</dd>
        <dt>Phiên bản tài liệu</dt>
        <dd className="m-0 text-chu">v{q.phien_ban_tai_lieu}</dd>
        {bc?.diem != null && (
          <>
            <dt>Điểm kiểm tra</dt>
            <dd className="m-0 text-chu">
              {bc.diem}%{bc.thi_luc ? ` · ${dinhDangNgay(bc.thi_luc)}` : ""}
            </dd>
          </>
        )}
        {bc?.duyet_luc && (
          <>
            <dt>Thực hành duyệt</dt>
            <dd className="m-0 text-chu">{dinhDangNgay(bc.duyet_luc)}</dd>
          </>
        )}
      </dl>

      {thaoTac.loi && <ThongBaoNoiDong kieu="loi">{thaoTac.loi}</ThongBaoNoiDong>}
      {xong && <ThongBaoNoiDong kieu="thanh-cong">Đã xác nhận — mã {q.ma_mau} được bán trở lại.</ThongBaoNoiDong>}

      {q.trang_thai === "CAN_HOC_LAI" && q.khoa_hoc_id && (
        <div className="flex flex-wrap gap-3">
          {q.yeu_cau_hoc_lai === "THI_LAI" ? (
            <NutLienKet href={`/hoc-vien/bai-kiem-tra/${q.khoa_hoc_id}`} co="nho">
              Học lại & thi
            </NutLienKet>
          ) : (
            <>
              <NutLienKet href={`/hoc-vien/khoa-hoc/${q.khoa_hoc_id}`} kieu="vien" co="nho">
                Xem tài liệu
              </NutLienKet>
              {!xong && (
                <Nut co="nho" onClick={() => void xacNhan()} dangXuLy={thaoTac.dangXuLy}>
                  Đã đọc thay đổi
                </Nut>
              )}
            </>
          )}
        </div>
      )}
      {q.trang_thai === "HOAT_DONG" && q.khoa_hoc_id && (
        <NutLienKet href={`/hoc-vien/khoa-hoc/${q.khoa_hoc_id}`} kieu="vien" co="nho" className="self-start">
          Ôn lại kiến thức
        </NutLienKet>
      )}
    </article>
  );
}

/** Ma chua co quyen: khoa SAN_PHAM chua dat */
function TheChuaCo({ k }: { k: KhoaHocTomTat }) {
  return (
    <article className="flex min-w-0 flex-col gap-3 rounded-xl border border-dashed border-vien-dam bg-be-mat p-4 md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="font-mono text-h2 text-chu-phu">{k.ma_mau ?? "—"}</span>
          <span className="text-sm text-chu-phu">{tenBoMa(k.ten, k.ma_mau)}</span>
        </div>
        <Nhan tong="trung-tinh">Chưa được bán</Nhan>
      </div>
      <p className="m-0 text-sm text-chu-phu">
        Học {k.so_bai} bài và đạt bài kiểm tra từ 90%{k.can_thuc_hanh ? ", nộp thực hành được duyệt" : ""} để được cấp quyền.
        {k.tien_do.so_bai_xong > 0 ? ` Đã học ${k.tien_do.so_bai_xong}/${k.tien_do.so_bai} bài.` : ""}
      </p>
      <NutLienKet href={`/hoc-vien/khoa-hoc/${k.id}`} co="nho" className="self-start">
        {k.tien_do.so_bai_xong > 0 ? "Học tiếp" : "Học để mở quyền"}
      </NutLienKet>
    </article>
  );
}

/** Quyen SKU cua toi: ma nao duoc ban, ma nao can hoc lai, ma nao chua hoc (KIEN-TRUC muc 5) */
export function ManQuyenSku() {
  const quyen = useQuyenSku();
  const khoa = useDsKhoaHoc();
  const [loc, setLoc] = useState<Loc>("TAT_CA");

  const dsQ = quyen.data ?? [];
  const khoaSp = (khoa.data ?? []).filter(k => k.loai === "SAN_PHAM" && k.mau_id);
  const chuaCo = khoaSp.filter(k => !dsQ.some(q => q.mau_id === k.mau_id));
  const duocBan = dsQ.filter(q => q.trang_thai === "HOAT_DONG");
  const canHocLai = dsQ.filter(q => q.trang_thai === "CAN_HOC_LAI");
  const thuHoi = dsQ.filter(q => q.trang_thai === "THU_HOI");

  const hienQ =
    loc === "DUOC_BAN" ? duocBan : loc === "CAN_HOC_LAI" ? canHocLai : loc === "CHUA_CO" ? [] : [...canHocLai, ...duocBan, ...thuHoi];
  const hienChuaCo = loc === "TAT_CA" || loc === "CHUA_CO" ? chuaCo : [];

  return (
    <div className="flex flex-col gap-6 [&>header]:mb-0">
      <TieuDeTrang
        kicker="Học trước khi bán"
        tieuDe="Quyền SKU của tôi"
        moTa="Chỉ mã đã học và đạt mới được tư vấn, lấy mã giới thiệu, nhận chiến dịch và bán. Khi sản phẩm đổi thông tin quan trọng, quyền tạm dừng tới khi bạn học lại."
      />

      {quyen.dangTai || khoa.dangTai ? (
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <KhungCho className="h-[108px]" />
            <KhungCho className="h-[108px]" />
            <KhungCho className="h-[108px]" />
          </div>
          <KhungCho className="h-[180px]" />
        </div>
      ) : !quyen.data ? (
        <Loi tieuDe="Không tải được quyền SKU" chiTiet={quyen.loi} thuLai={quyen.taiLai} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <OSoLieu nhan="Mã được bán" giaTri={duocBan.length} />
            <OSoLieu nhan="Cần học lại" giaTri={canHocLai.length} />
            <OSoLieu nhan="Chưa học" giaTri={khoa.data ? chuaCo.length : "—"} />
          </div>

          {canHocLai.length > 0 && (
            <ThongBaoNoiDong kieu="canh-bao">
              {canHocLai.map(q => q.ma_mau).join(", ")} đang tạm dừng bán vì tài liệu vừa cập nhật. Xác nhận hoặc học lại để mở lại quyền.
            </ThongBaoNoiDong>
          )}
          {khoa.loi && !khoa.data && <ThongBaoNoiDong kieu="canh-bao">Không tải được danh sách khóa sản phẩm: {khoa.loi}</ThongBaoNoiDong>}

          <div className={cn(lopThanhTab, "self-start")} role="group" aria-label="Lọc quyền SKU">
            <NutLoc dangChon={loc === "TAT_CA"} onClick={() => setLoc("TAT_CA")}>
              Tất cả
            </NutLoc>
            <NutLoc dangChon={loc === "DUOC_BAN"} onClick={() => setLoc("DUOC_BAN")}>
              Được bán ({duocBan.length})
            </NutLoc>
            <NutLoc dangChon={loc === "CAN_HOC_LAI"} onClick={() => setLoc("CAN_HOC_LAI")}>
              Cần học lại ({canHocLai.length})
            </NutLoc>
            <NutLoc dangChon={loc === "CHUA_CO"} onClick={() => setLoc("CHUA_CO")}>
              Chưa học ({chuaCo.length})
            </NutLoc>
          </div>

          {!hienQ.length && !hienChuaCo.length ? (
            <Trong
              tieuDe={loc === "TAT_CA" ? "Chưa có khóa sản phẩm" : "Không có mã nào"}
              moTa="Khóa sản phẩm (mỗi mã một khóa) sẽ hiện ở đây khi được mở cho vai trò của bạn."
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {hienQ.map(q => (
                <TheQuyen key={q.id} q={q} />
              ))}
              {hienChuaCo.map(k => (
                <TheChuaCo key={k.id} k={k} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
