"use client";

import type { DanhSachThongBao } from "@thien-khue/contracts";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DangTai, Loi, Nhan, Nut, The, TieuDeTrang, Trong } from "@/components/ui";
import { useTaiDuLieu } from "@/features/quan-tri/dung-chung";
import { api, thongDiepLoi } from "@/lib/api";
import { cn } from "@/lib/cn";
import { dinhDangNgayGio } from "@/lib/dinh-dang";
import { duongDanNoiBo } from "./chuong-thong-bao";

/** Nhan loai thong bao */
const NHAN_LOAI: Record<string, string> = {
  HE_THONG: "Hệ thống",
  DAO_TAO: "Đào tạo",
  QUYEN_SKU: "Quyền SKU",
  KHACH_MOI: "Khách mới",
  DON_HANG: "Đơn hàng",
  HOA_HONG: "Hoa hồng",
  CHIEN_DICH: "Chiến dịch",
  PHE_DUYET: "Phê duyệt"
};

/** Tat ca thong bao cua toi (100 moi nhat), loc chua doc, danh dau da doc */
export function TrangThongBao() {
  const router = useRouter();
  const [chiChuaDoc, setChiChuaDoc] = useState(false);
  const [loiThaoTac, setLoiThaoTac] = useState<string | null>(null);
  const tb = useTaiDuLieu(() => api.get<DanhSachThongBao>("/thong-bao", { gioi_han: 100, chi_chua_doc: chiChuaDoc }), [chiChuaDoc]);

  async function daDoc(ids?: string[]) {
    setLoiThaoTac(null);
    try {
      await api.post("/thong-bao/da-doc", ids ? { ids } : {});
      await tb.taiLai();
    } catch (e) {
      setLoiThaoTac(thongDiepLoi(e));
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <TieuDeTrang
        kicker="Cá nhân"
        tieuDe="Thông báo"
        moTa="Duyệt đề xuất, quyền SKU, khách mới, hoa hồng… gửi cho riêng bạn."
        hanhDong={
          <div className="flex flex-wrap gap-2">
            <Nut kieu={chiChuaDoc ? "chinh" : "vien"} co="nho" onClick={() => setChiChuaDoc(v => !v)} aria-pressed={chiChuaDoc}>
              Chỉ chưa đọc
            </Nut>
            <Nut kieu="vien" co="nho" disabled={!tb.duLieu?.chua_doc} onClick={() => void daDoc()}>
              Đánh dấu đã đọc hết{tb.duLieu?.chua_doc ? ` (${tb.duLieu.chua_doc})` : ""}
            </Nut>
          </div>
        }
      />
      {loiThaoTac && <p className="m-0 text-sm text-loi">{loiThaoTac}</p>}
      {tb.loi ? (
        <Loi chiTiet={tb.loi} thuLai={() => void tb.taiLai()} />
      ) : !tb.duLieu && tb.dangTai ? (
        <DangTai />
      ) : !tb.duLieu?.ds.length ? (
        <Trong tieuDe={chiChuaDoc ? "Không còn thông báo chưa đọc" : "Chưa có thông báo nào"} />
      ) : (
        <The className="px-4 py-1 md:px-5 md:py-1">
          <ul className="m-0 flex list-none flex-col p-0">
            {tb.duLieu.ds.map(t => {
              const di = duongDanNoiBo(t.lien_ket);
              return (
                <li key={t.id} className="flex flex-col gap-2 border-b border-vien py-3 last:border-b-0 sm:flex-row sm:items-start sm:gap-4">
                  <span className="so shrink-0 text-xs text-chu-mo sm:w-[140px]">{dinhDangNgayGio(t.created_at)}</span>
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <strong className={cn("text-sm text-chu", t.da_doc && "font-medium text-chu-phu")}>{t.tieu_de}</strong>
                      <Nhan tong="trung-tinh">{NHAN_LOAI[t.loai] ?? t.loai}</Nhan>
                      {!t.da_doc && <Nhan tong="chinh">Mới</Nhan>}
                    </div>
                    {t.noi_dung && <p className="m-0 text-sm text-chu-phu">{t.noi_dung}</p>}
                    <div className="flex flex-wrap gap-3 pt-1">
                      {di && (
                        <button
                          type="button"
                          className="min-h-[32px] text-sm font-medium text-lien-ket hover:underline"
                          onClick={() => {
                            if (!t.da_doc) void api.post("/thong-bao/da-doc", { ids: [t.id] }).catch(() => undefined);
                            router.push(di);
                          }}
                        >
                          Mở
                        </button>
                      )}
                      {!t.da_doc && (
                        <button type="button" className="min-h-[32px] text-sm text-chu-phu hover:underline" onClick={() => void daDoc([t.id])}>
                          Đánh dấu đã đọc
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </The>
      )}
    </div>
  );
}
