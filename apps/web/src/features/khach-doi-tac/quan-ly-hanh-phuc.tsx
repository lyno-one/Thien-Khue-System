"use client";

import { DANH_SACH_TRANG_THAI_MOI_KH, NHAN_TRANG_THAI_MOI_KH, SO_LAN_MUA_KH_HANH_PHUC } from "@thien-khue/contracts";
import { useState } from "react";
import { Bang, DangTai, Loi, Nhan, Nut, OChon, ONhap, The, TheTieuDe, ThongBaoNoiDong } from "@/components/ui";
import { dinhDangNgay, dinhDangTien } from "@/lib/dinh-dang";
import { apiKdt, useTai, useThaoTac } from "./api";
import { DiemCham, NhanMoi } from "./hien-thi";
import { PhanTrangGon } from "./khung-quan-ly";

/** Tab Khach hang hanh phuc: ung vien (>= 10 lan mua), loi moi, gop y mau thu */
export function QuanLyHanhPhuc() {
  const [lamMoi, setLamMoi] = useState(0);
  return (
    <div className="flex flex-col gap-8">
      <ThongBaoNoiDong>
        Chương trình tự nguyện: chỉ mời, không ép tham gia. Khách đã từ chối sẽ không bị mời lại. Hình ảnh chỉ được dùng truyền thông khi khách đồng ý ở cả hồ sơ
        tham gia lẫn từng góp ý.
      </ThongBaoNoiDong>
      <UngVien sauKhiMoi={() => setLamMoi(x => x + 1)} />
      <DanhSachMoi lamMoi={lamMoi} />
      <DanhSachPhanHoi />
    </div>
  );
}

function UngVien({ sauKhiMoi }: { sauKhiMoi: () => void }) {
  const ds = useTai(apiKdt.ungVien);
  const tt = useThaoTac();
  const [sdtTay, setSdtTay] = useState("");
  const [thongBao, setThongBao] = useState<string | null>(null);
  const moi = async (sdt: string) => {
    setThongBao(null);
    const r = await tt.chay(() => apiKdt.moi({ sdt }));
    if (r) {
      setThongBao(`Đã gửi lời mời tới ${r.ten_khach ?? r.sdt_chuan}.`);
      setSdtTay("");
      sauKhiMoi();
      await ds.taiLai();
    }
  };
  return (
    <The>
      <TheTieuDe kicker="Ứng viên" tieuDe={`Khách từ ${SO_LAN_MUA_KH_HANH_PHUC} lần mua hợp lệ chưa được mời`} moTa="Đếm lại từ CRM mỗi lần mở (đơn huỷ / hoàn không tính)." />
      <form
        onSubmit={e => {
          e.preventDefault();
          void moi(sdtTay);
        }}
        className="mb-5 flex flex-wrap items-end gap-3"
      >
        <ONhap nhan="Mời theo số điện thoại" type="tel" value={sdtTay} onChange={e => setSdtTay(e.target.value)} placeholder="09xx xxx xxx" lopKhung="min-w-[220px] flex-1" />
        <Nut type="submit" kieu="vien" dangXuLy={tt.dangXuLy} disabled={!sdtTay.trim()}>
          Gửi lời mời
        </Nut>
      </form>
      {tt.loi && <ThongBaoNoiDong kieu="loi" className="mb-4">{tt.loi}</ThongBaoNoiDong>}
      {thongBao && <ThongBaoNoiDong kieu="thanh-cong" className="mb-4">{thongBao}</ThongBaoNoiDong>}
      {ds.dangTai && !ds.data ? (
        <DangTai />
      ) : ds.loi ? (
        <Loi chiTiet={ds.loi} thuLai={() => void ds.taiLai()} />
      ) : (
        <Bang
          dong={ds.data ?? []}
          khoaDong={k => k.sdt_chuan}
          cot={[
            { khoa: "ten", tieuDe: "Khách", hienThi: k => <span className="flex flex-col"><strong>{k.ten_khach ?? "—"}</strong><span className="text-sm text-chu-phu">{k.sdt_chuan}</span></span> },
            { khoa: "so_don", tieuDe: "Lần mua", canPhai: true },
            { khoa: "tong", tieuDe: "Tích luỹ", canPhai: true, hienThi: k => dinhDangTien(k.tong_tien) },
            { khoa: "cuoi", tieuDe: "Mua gần nhất", hienThi: k => dinhDangNgay(k.lan_mua_cuoi) },
            {
              khoa: "moi",
              tieuDe: "",
              canPhai: true,
              hienThi: k => (
                <Nut co="nho" onClick={() => void moi(k.sdt_chuan)} disabled={tt.dangXuLy}>
                  Mời
                </Nut>
              )
            }
          ]}
          rong={<p className="m-0 text-sm text-chu-phu">Không có ứng viên mới.</p>}
        />
      )}
    </The>
  );
}

function DanhSachMoi({ lamMoi }: { lamMoi: number }) {
  const [trang, setTrang] = useState(1);
  const [loc, setLoc] = useState("");
  const ds = useTai(() => apiKdt.dsMoi({ trang, trang_thai: loc || undefined }), [trang, loc, lamMoi]);
  const tt = useThaoTac();
  const doi = async (id: string, trangThai: "DA_GUI_MAU" | "ROI_CHUONG_TRINH") => {
    if (await tt.chay(() => apiKdt.capNhatMoi(id, { trang_thai: trangThai }))) await ds.taiLai();
  };
  return (
    <The>
      <TheTieuDe
        kicker="Lời mời"
        tieuDe="Khách trong chương trình"
        hanhDong={
          <OChon
            aria-label="Lọc trạng thái"
            value={loc}
            onChange={e => {
              setLoc(e.target.value);
              setTrang(1);
            }}
            luaChon={[{ giaTri: "", nhan: "Mọi trạng thái" }, ...DANH_SACH_TRANG_THAI_MOI_KH.map(t => ({ giaTri: t, nhan: NHAN_TRANG_THAI_MOI_KH[t] }))]}
          />
        }
      />
      {tt.loi && <ThongBaoNoiDong kieu="loi" className="mb-4">{tt.loi}</ThongBaoNoiDong>}
      {ds.dangTai && !ds.data ? (
        <DangTai />
      ) : ds.loi ? (
        <Loi chiTiet={ds.loi} thuLai={() => void ds.taiLai()} />
      ) : (
        <>
          <Bang
            dong={ds.data?.data ?? []}
            khoaDong={m => m.id}
            cot={[
              { khoa: "ten", tieuDe: "Khách", hienThi: m => <span className="flex flex-col"><strong>{m.ten_khach ?? "—"}</strong><span className="text-sm text-chu-phu">{m.sdt_chuan}</span></span> },
              { khoa: "tt", tieuDe: "Trạng thái", hienThi: m => <NhanMoi tt={m.trang_thai} /> },
              { khoa: "hinh", tieuDe: "Dùng hình", hienThi: m => (m.dong_y_dung_hinh ? <Nhan tong="thanh-cong">Đồng ý</Nhan> : <Nhan tong="trung-tinh">Không</Nhan>) },
              { khoa: "ph", tieuDe: "Góp ý", canPhai: true, hienThi: m => m.so_phan_hoi ?? 0 },
              { khoa: "moi", tieuDe: "Mời ngày", hienThi: m => dinhDangNgay(m.moi_luc) },
              {
                khoa: "tac",
                tieuDe: "",
                canPhai: true,
                hienThi: m => (
                  <span className="flex justify-end gap-2">
                    {(m.trang_thai === "THAM_GIA" || m.trang_thai === "DA_PHAN_HOI") && (
                      <Nut co="nho" kieu="vien" onClick={() => void doi(m.id, "DA_GUI_MAU")} disabled={tt.dangXuLy}>
                        Đã gửi mẫu
                      </Nut>
                    )}
                    {m.trang_thai !== "TU_CHOI" && m.trang_thai !== "ROI_CHUONG_TRINH" && (
                      <Nut co="nho" kieu="trong" onClick={() => void doi(m.id, "ROI_CHUONG_TRINH")} disabled={tt.dangXuLy}>
                        Kết thúc
                      </Nut>
                    )}
                  </span>
                )
              }
            ]}
            rong={<p className="m-0 text-sm text-chu-phu">Chưa có lời mời.</p>}
          />
          <PhanTrangGon trang={trang} tongTrang={ds.data?.meta?.tong_trang ?? 1} doi={setTrang} />
        </>
      )}
    </The>
  );
}

function DanhSachPhanHoi() {
  const [trang, setTrang] = useState(1);
  const [chiDungHinh, setChiDungHinh] = useState(false);
  const ds = useTai(() => apiKdt.dsPhanHoi({ trang, chi_duoc_dung_hinh: chiDungHinh ? "true" : undefined }), [trang, chiDungHinh]);
  return (
    <The>
      <TheTieuDe
        kicker="Góp ý riêng tư"
        tieuDe="Góp ý mẫu thử"
        moTa="Size, chất liệu, kiểu dáng — dùng cho đội sản phẩm."
        hanhDong={
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={chiDungHinh}
              onChange={e => {
                setChiDungHinh(e.target.checked);
                setTrang(1);
              }}
              className="h-5 w-5 accent-chinh"
            />
            Chỉ góp ý được dùng hình
          </label>
        }
      />
      {ds.dangTai && !ds.data ? (
        <DangTai />
      ) : ds.loi ? (
        <Loi chiTiet={ds.loi} thuLai={() => void ds.taiLai()} />
      ) : !ds.data?.data.length ? (
        <p className="m-0 text-sm text-chu-phu">Chưa có góp ý.</p>
      ) : (
        <>
          <ul className="m-0 flex list-none flex-col p-0">
            {ds.data.data.map(p => (
              <li key={p.id} className="flex flex-col gap-2 border-t border-vien py-4 first:border-0 first:pt-0">
                <span className="flex flex-wrap items-center gap-3 text-sm text-chu-phu">
                  <strong className="text-h4 text-chu">{p.ten_khach ?? p.sdt_chuan}</strong>
                  {p.ma_mau && <Nhan tong="chinh">{p.ma_mau}</Nhan>}
                  {dinhDangNgay(p.created_at)}
                  {p.hinh_anh.length > 0 && (p.duoc_dung_hinh ? <Nhan tong="thanh-cong">Được dùng hình</Nhan> : <Nhan tong="canh-bao">Hình chỉ dùng nội bộ</Nhan>)}
                </span>
                <span className="flex flex-wrap gap-4">
                  <DiemCham nhan="Size" diem={p.diem_size} />
                  <DiemCham nhan="Chất liệu" diem={p.diem_chat_lieu} />
                  <DiemCham nhan="Kiểu dáng" diem={p.diem_kieu_dang} />
                </span>
                <p className="m-0 text-sm leading-relaxed">{p.noi_dung}</p>
                {p.hinh_anh.length > 0 && (
                  <span className="flex flex-wrap gap-2">
                    {p.hinh_anh.map(h => (
                      <a key={h} href={h} target="_blank" rel="noreferrer" className="text-sm font-medium text-lien-ket hover:underline hover:underline">
                        Xem hình
                      </a>
                    ))}
                  </span>
                )}
              </li>
            ))}
          </ul>
          <PhanTrangGon trang={trang} tongTrang={ds.data.meta?.tong_trang ?? 1} doi={setTrang} />
        </>
      )}
    </The>
  );
}
