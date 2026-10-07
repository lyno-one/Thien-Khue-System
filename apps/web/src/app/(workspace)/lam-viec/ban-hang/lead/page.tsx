"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  DANH_SACH_TRANG_THAI_LEAD,
  NHAN_TRANG_THAI_LEAD,
  type DoiTrangThaiLeadBody,
  type KetQuaPhanBo,
  type KetQuaPhanBoLoat,
  type Lead,
  type PhanTrangMeta,
  type TrangThaiLead
} from "@thien-khue/contracts";
import { Bang, DangTai, Loi, Nut, OChon, ONhap, ThongBaoNoiDong, TieuDeTrang, Trong } from "@/components/ui";
import { useTai } from "@/features/ban-hang/dung-tai";
import { NhanLoaiLead, NhanTrangThaiLead, dinhDangSdt } from "@/features/ban-hang/nhan-ban-hang";
import { api, thongDiepLoi } from "@/lib/api";
import { dinhDangNgayGio } from "@/lib/dinh-dang";
import { useXacThuc } from "@/providers/auth-provider";

const BUOC_TIEP: Record<TrangThaiLead, DoiTrangThaiLeadBody["trang_thai"][]> = {
  MOI: [],
  DA_PHAN_BO: ["DANG_XU_LY", "THAT_BAI", "TRUNG"],
  DANG_XU_LY: ["THANH_CONG", "THAT_BAI"],
  THANH_CONG: [],
  THAT_BAI: ["DANG_XU_LY"],
  TRUNG: []
};

/** Lead tu trang cong khai: Sale / CSKH thay lead phan bo cho minh; QUAN_LY thay het + phan bo */
export default function TrangLead() {
  const { coVai } = useXacThuc();
  const laQuanLy = coVai("QUAN_LY");
  const [trang, setTrang] = useState(1);
  const [trangThai, setTrangThai] = useState<TrangThaiLead | "">("");
  const [tuKhoa, setTuKhoa] = useState("");
  const [q, setQ] = useState("");
  const [thongBao, setThongBao] = useState<{ kieu: "thanh-cong" | "canh-bao" | "thong-tin"; chu: string } | null>(null);
  const [dangLam, setDangLam] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setQ(tuKhoa.trim());
      setTrang(1);
    }, 350);
    return () => clearTimeout(t);
  }, [tuKhoa]);

  const { data, loi, dangTai, taiLai } = useTai(
    () => api.layCoMeta<Lead[], PhanTrangMeta>("/ban-hang/lead", { trang, so_dong: 20, trang_thai: trangThai || undefined, q }),
    [trang, trangThai, q]
  );

  async function lam(khoa: string, ham: () => Promise<string>) {
    setDangLam(khoa);
    setThongBao(null);
    try {
      setThongBao({ kieu: "thanh-cong", chu: await ham() });
      await taiLai();
    } catch (e) {
      setThongBao({ kieu: "canh-bao", chu: thongDiepLoi(e) });
    } finally {
      setDangLam(null);
    }
  }

  const phanBoTatCa = () =>
    lam("tat-ca", async () => {
      const kq = await api.post<KetQuaPhanBoLoat>("/ban-hang/phan-bo/lead-moi");
      return `Đã phân bổ ${kq.da_phan_bo} lead, còn ${kq.chua_phan_bo} lead chưa có người phù hợp.`;
    });
  const phanBoKhachCanCham = () =>
    lam("can-cham", async () => {
      const kq = await api.post<KetQuaPhanBoLoat>("/ban-hang/phan-bo/khach-can-cham");
      return `Khách CRM cần chăm: giao ${kq.da_phan_bo}, chưa giao được ${kq.chua_phan_bo}.`;
    });

  return (
    <>
      <TieuDeTrang
        kicker="Sale / CSKH"
        tieuDe="Lead"
        moTa="Khách đăng ký từ trang công khai — phân bổ theo ca trực, quyền SKU và tải việc."
        hanhDong={
          laQuanLy ? (
            <>
              <Nut kieu="vien" co="nho" onClick={phanBoKhachCanCham} dangXuLy={dangLam === "can-cham"}>
                Phân bổ khách CRM cần chăm
              </Nut>
              <Nut co="nho" onClick={phanBoTatCa} dangXuLy={dangLam === "tat-ca"}>
                Phân bổ lead mới
              </Nut>
            </>
          ) : undefined
        }
      />
      {thongBao && (
        <ThongBaoNoiDong kieu={thongBao.kieu} className="mb-4">
          {thongBao.chu}
        </ThongBaoNoiDong>
      )}
      <div className="mb-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
        <ONhap placeholder="Tìm theo tên hoặc số điện thoại" aria-label="Tìm lead" value={tuKhoa} onChange={e => setTuKhoa(e.target.value)} />
        <OChon
          aria-label="Lọc trạng thái"
          value={trangThai}
          onChange={e => {
            setTrangThai(e.target.value as TrangThaiLead | "");
            setTrang(1);
          }}
          goiYChon="Mọi trạng thái"
          luaChon={DANH_SACH_TRANG_THAI_LEAD.map(t => ({ giaTri: t, nhan: NHAN_TRANG_THAI_LEAD[t] }))}
        />
      </div>
      {dangTai && !data ? (
        <DangTai />
      ) : loi ? (
        <Loi chiTiet={loi} thuLai={taiLai} />
      ) : (
        <>
          <Bang<Lead>
            dong={data?.data ?? []}
            khoaDong={l => l.id}
            rong={<Trong tieuDe="Chưa có lead" moTa="Lead đăng ký từ trang công khai sẽ xuất hiện ở đây." />}
            cot={[
              {
                khoa: "ten",
                tieuDe: "Lead",
                hienThi: l =>
                  l.phan_bo_cho ? (
                    <Link href={`/lam-viec/ban-hang/khach/${l.sdt_chuan}`} className="flex flex-col text-chu no-underline hover:text-chinh">
                      <span className="font-semibold">{l.ten}</span>
                      <span className="text-sm text-chu-phu">{dinhDangSdt(l.sdt_chuan)}</span>
                    </Link>
                  ) : (
                    <div className="flex flex-col">
                      <span className="font-semibold">{l.ten}</span>
                      <span className="text-sm text-chu-phu">{dinhDangSdt(l.sdt_chuan)}</span>
                    </div>
                  )
              },
              { khoa: "loai", tieuDe: "Loại", hienThi: l => <NhanLoaiLead loai={l.loai} /> },
              {
                khoa: "nhu_cau",
                tieuDe: "Nhu cầu",
                hienThi: l => (
                  <span className="line-clamp-2 max-w-[260px] text-sm text-chu-phu">
                    {[l.nhu_cau, l.ma_mau_quan_tam ? `Mã ${l.ma_mau_quan_tam}` : null, l.ma_gioi_thieu ? `Giới thiệu ${l.ma_gioi_thieu}` : null].filter(Boolean).join(" · ") ||
                      "—"}
                  </span>
                )
              },
              ...(laQuanLy ? [{ khoa: "phu_trach", tieuDe: "Phụ trách", hienThi: (l: Lead) => l.phan_bo_cho_ten ?? "—" }] : []),
              { khoa: "trang_thai", tieuDe: "Trạng thái", hienThi: l => <NhanTrangThaiLead trangThai={l.trang_thai} /> },
              { khoa: "tao", tieuDe: "Đăng ký", hienThi: l => <span className="whitespace-nowrap text-sm">{dinhDangNgayGio(l.created_at)}</span> },
              {
                khoa: "hanh_dong",
                tieuDe: "",
                canPhai: true,
                hienThi: l => (
                  <div className="flex flex-wrap justify-end gap-2">
                    {laQuanLy && l.trang_thai === "MOI" && (
                      <Nut
                        co="nho"
                        kieu="nhat"
                        dangXuLy={dangLam === l.id}
                        onClick={() =>
                          lam(l.id, async () => {
                            const kq = await api.post<KetQuaPhanBo>(`/ban-hang/lead/${l.id}/phan-bo`, {});
                            return kq.ho_so_id ? `Đã giao ${l.ten} cho ${kq.ho_ten}: ${kq.ly_do}` : `Chưa phân bổ được: ${kq.ly_do}`;
                          })
                        }
                      >
                        Phân bổ
                      </Nut>
                    )}
                    {BUOC_TIEP[l.trang_thai].map(s => (
                      <Nut
                        key={s}
                        co="nho"
                        kieu={s === "THANH_CONG" ? "chinh" : s === "THAT_BAI" ? "trong" : "vien"}
                        disabled={dangLam === `${l.id}-${s}`}
                        onClick={() =>
                          lam(`${l.id}-${s}`, async () => {
                            await api.patch(`/ban-hang/lead/${l.id}/trang-thai`, { trang_thai: s });
                            return `Đã chuyển ${l.ten} sang “${NHAN_TRANG_THAI_LEAD[s]}”.`;
                          })
                        }
                      >
                        {NHAN_TRANG_THAI_LEAD[s]}
                      </Nut>
                    ))}
                  </div>
                )
              }
            ]}
          />
          {data?.meta && data.meta.tong_trang > 1 && (
            <div className="mt-4 flex items-center justify-between gap-3 text-sm text-chu-phu">
              <span>
                Trang {data.meta.trang}/{data.meta.tong_trang} · {data.meta.tong} lead
              </span>
              <div className="flex gap-2">
                <Nut kieu="vien" co="nho" disabled={trang <= 1} onClick={() => setTrang(t => t - 1)}>
                  Trước
                </Nut>
                <Nut kieu="vien" co="nho" disabled={trang >= data.meta.tong_trang} onClick={() => setTrang(t => t + 1)}>
                  Sau
                </Nut>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
