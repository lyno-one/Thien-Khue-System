"use client";

import type { HangThanhVien, QuaTang, Voucher } from "@thien-khue/contracts";
import { DANH_SACH_HANG_THANH_VIEN, DANH_SACH_TRANG_THAI_CAP_PHAT, NHAN_HANG_THANH_VIEN, NHAN_TRANG_THAI_CAP_PHAT } from "@thien-khue/contracts";
import { useState } from "react";
import { Bang, DangTai, HopThoai, Loi, Nut, OChon, ONhap, OVanBan, The, TheTieuDe, ThongBaoNoiDong } from "@/components/ui";
import { dinhDangNgay, dinhDangNgayGio, dinhDangTien } from "@/lib/dinh-dang";
import { useXacThuc } from "@/providers/auth-provider";
import { apiKdt, laThienKhueThat, useTai, useThaoTac } from "./api";
import { moTaGiam, NhanCapPhat, NhanDuyet, NhanHangApDung } from "./hien-thi";
import { PhanTrangGon } from "./khung-quan-ly";

/*
 * Tab Qua tang & voucher. Luong qua: De xuat (CHO_THAM_DINH) -> Tham dinh (QUAN_LY, khac nguoi de xuat)
 * -> Thien Khue duyet (khac ca hai) -> hien thi cho khach. Voucher: tao -> Thien Khue duyet (nguoi tao khong tu duyet).
 */
export function QuanLyUuDai() {
  const { coVai } = useXacThuc();
  const [phienBan, setPhienBan] = useState(0);
  const lamMoi = () => setPhienBan(x => x + 1);
  const laQuanLy = coVai("QUAN_LY");
  return (
    <div className="flex flex-col gap-8">
      <CapPhat phienBan={phienBan} sauKhiCap={lamMoi} />
      {laQuanLy && <DanhSachQua phienBan={phienBan} lamMoi={lamMoi} />}
      {laQuanLy && <DanhSachVoucher phienBan={phienBan} lamMoi={lamMoi} />}
    </div>
  );
}

function ChonHang({ ds, doi }: { ds: HangThanhVien[]; doi: (ds: HangThanhVien[]) => void }) {
  return (
    <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
      <legend className="mb-2 text-sm font-semibold text-chu">Hạng được hưởng</legend>
      <div className="flex flex-wrap gap-4">
        {DANH_SACH_HANG_THANH_VIEN.map(h => (
          <label key={h} className="flex min-h-[44px] items-center gap-2 text-sm">
            <input type="checkbox" className="h-5 w-5 accent-chinh" checked={ds.includes(h)} onChange={e => doi(e.target.checked ? [...ds, h] : ds.filter(x => x !== h))} />
            {NHAN_HANG_THANH_VIEN[h]}
          </label>
        ))}
      </div>
      <span className="text-sm text-chu-phu">Không chọn = mọi hạng thành viên (khách thường không được hưởng).</span>
    </fieldset>
  );
}

function useDsDoiTac() {
  const ds = useTai(() => apiKdt.dsDoiTac({}));
  return [{ giaTri: "", nhan: "— Không gắn đối tác —" }, ...(ds.data?.data ?? []).map(d => ({ giaTri: d.id, nhan: d.ten }))];
}

// ------------------------------------------------------------------ qua tang

function DanhSachQua({ phienBan, lamMoi }: { phienBan: number; lamMoi: () => void }) {
  const { nguoiDung } = useXacThuc();
  const [trang, setTrang] = useState(1);
  const ds = useTai(() => apiKdt.dsQua({ trang }), [trang, phienBan]);
  const [taoMo, setTaoMo] = useState(false);
  const [xuLy, setXuLy] = useState<{ qua: QuaTang; buoc: "tham-dinh" | "duyet" } | null>(null);
  const [sua, setSua] = useState<QuaTang | null>(null);
  const [hanhDong, setHanhDong] = useState<{ loai: "huy" | "ngung"; qua: QuaTang } | null>(null);
  const laThienKhue = laThienKhueThat(nguoiDung);
  const toi = nguoiDung?.id;

  return (
    <The>
      <TheTieuDe
        kicker="Quà tặng đối tác"
        tieuDe="Thẩm định & duyệt quà"
        moTa="Quà chỉ hiện cho khách khi Thiên Khuê đã duyệt. Người đề xuất không tự thẩm định hay duyệt."
        hanhDong={
          <Nut co="nho" onClick={() => setTaoMo(true)}>
            Đề xuất quà
          </Nut>
        }
      />
      {ds.dangTai && !ds.data ? (
        <DangTai />
      ) : ds.loi ? (
        <Loi chiTiet={ds.loi} thuLai={() => void ds.taiLai()} />
      ) : (
        <>
          <Bang
            dong={ds.data?.data ?? []}
            khoaDong={q => q.id}
            cot={[
              { khoa: "ten", tieuDe: "Quà", hienThi: q => <span className="flex flex-col"><strong>{q.ten}</strong><span className="text-sm text-chu-phu">{q.ten_doi_tac ?? "Thiên Khuê"}</span></span> },
              { khoa: "gia_tri", tieuDe: "Giá trị", canPhai: true, hienThi: q => dinhDangTien(q.gia_tri) },
              { khoa: "so_luong", tieuDe: "SL", canPhai: true, hienThi: q => q.so_luong ?? "∞" },
              { khoa: "hang", tieuDe: "Hạng", hienThi: q => <NhanHangApDung ds={q.hang_ap_dung} /> },
              {
                khoa: "tt",
                tieuDe: "Trạng thái",
                hienThi: q => (
                  <span className="flex flex-col gap-1">
                    <NhanDuyet tt={q.trang_thai} />
                    {q.trang_thai === "CHO_THAM_DINH" && <span className="text-xs text-chu-phu">{q.nguoi_tham_dinh_id ? "Đã thẩm định đạt, chờ Thiên Khuê" : "Chờ thẩm định"}</span>}
                    {q.ly_do_tu_choi && <span className="text-xs text-chu-phu">{q.ly_do_tu_choi}</span>}
                  </span>
                )
              },
              {
                khoa: "tac",
                tieuDe: "",
                canPhai: true,
                hienThi: q => {
                  const laNguoiDeXuat = q.nguoi_de_xuat_id === toi;
                  // Nguoi de xuat: sua khi chua ai tham dinh (hoac da bi tu choi -> sua de gui lai), huy khi chua duoc duyet
                  const suaDuoc = laNguoiDeXuat && (q.trang_thai === "TU_CHOI" || (q.trang_thai === "CHO_THAM_DINH" && !q.nguoi_tham_dinh_id));
                  const huyDuoc = laNguoiDeXuat && q.trang_thai !== "DA_DUYET";
                  let buoc: React.ReactNode = null;
                  if (q.trang_thai === "DA_DUYET") {
                    buoc = laThienKhue ? (
                      <Nut co="nho" kieu="vien-loi" onClick={() => setHanhDong({ loai: "ngung", qua: q })}>
                        Ngừng áp dụng
                      </Nut>
                    ) : null;
                  } else if (q.trang_thai === "CHO_THAM_DINH") {
                    if (!q.nguoi_tham_dinh_id) {
                      buoc = laNguoiDeXuat ? (
                        <span className="text-xs text-chu-phu">Chờ người khác thẩm định</span>
                      ) : (
                        <Nut co="nho" kieu="vien" onClick={() => setXuLy({ qua: q, buoc: "tham-dinh" })}>
                          Thẩm định
                        </Nut>
                      );
                    } else if (laThienKhue) {
                      buoc =
                        laNguoiDeXuat || q.nguoi_tham_dinh_id === toi ? (
                          <span className="text-xs text-chu-phu">Không tự duyệt</span>
                        ) : (
                          <Nut co="nho" onClick={() => setXuLy({ qua: q, buoc: "duyet" })}>
                            Duyệt
                          </Nut>
                        );
                    }
                  }
                  if (!suaDuoc && !huyDuoc && !buoc) return null;
                  return (
                    <span className="flex flex-wrap items-center justify-end gap-2">
                      {suaDuoc && (
                        <Nut co="nho" kieu="vien" onClick={() => setSua(q)}>
                          {q.trang_thai === "TU_CHOI" ? "Sửa & gửi lại" : "Sửa"}
                        </Nut>
                      )}
                      {huyDuoc && (
                        <Nut co="nho" kieu="vien-loi" onClick={() => setHanhDong({ loai: "huy", qua: q })}>
                          Huỷ
                        </Nut>
                      )}
                      {buoc}
                    </span>
                  );
                }
              }
            ]}
            rong={<p className="m-0 text-sm text-chu-phu">Chưa có quà nào.</p>}
          />
          <PhanTrangGon trang={trang} tongTrang={ds.data?.meta?.tong_trang ?? 1} doi={setTrang} />
        </>
      )}
      {taoMo && (
        <HopThoaiTaoQua
          dong={() => setTaoMo(false)}
          xong={() => {
            setTaoMo(false);
            lamMoi();
          }}
        />
      )}
      {sua && (
        <HopThoaiTaoQua
          sua={sua}
          dong={() => setSua(null)}
          xong={() => {
            setSua(null);
            lamMoi();
          }}
        />
      )}
      {hanhDong && (
        <HopThoaiHanhDong
          tieuDe={hanhDong.loai === "huy" ? `Huỷ quà "${hanhDong.qua.ten}"` : `Ngừng áp dụng quà "${hanhDong.qua.ten}"`}
          moTa={hanhDong.loai === "huy" ? "Quà sẽ bị xoá khỏi danh sách đề xuất. Không hoàn tác được." : "Quà không còn hiện cho khách và không cấp thêm được. Lượt đã cấp giữ nguyên."}
          nhanNut={hanhDong.loai === "huy" ? "Huỷ quà" : "Ngừng áp dụng"}
          canLyDo={hanhDong.loai === "ngung"}
          chay={lyDo => (hanhDong.loai === "huy" ? apiKdt.huyQua(hanhDong.qua.id) : apiKdt.ngungQua(hanhDong.qua.id, { ly_do: lyDo }))}
          dong={() => setHanhDong(null)}
          xong={() => {
            setHanhDong(null);
            lamMoi();
          }}
        />
      )}
      {xuLy && (
        <HopThoaiXuLy
          tieuDe={xuLy.buoc === "tham-dinh" ? `Thẩm định: ${xuLy.qua.ten}` : `Duyệt quà: ${xuLy.qua.ten}`}
          moTa={xuLy.buoc === "tham-dinh" ? "Kiểm tra chất lượng, nguồn gốc, phù hợp thương hiệu." : xuLy.qua.ket_qua_tham_dinh ? `Kết quả thẩm định: ${xuLy.qua.ket_qua_tham_dinh}` : undefined}
          nhanDong={xuLy.buoc === "tham-dinh" ? "Đạt" : "Duyệt"}
          nhanKhong={xuLy.buoc === "tham-dinh" ? "Không đạt" : "Từ chối"}
          batBuocGhiChu={xuLy.buoc === "tham-dinh"}
          gui={(dongY, ghiChu) =>
            xuLy.buoc === "tham-dinh" ? apiKdt.thamDinhQua(xuLy.qua.id, { dat: dongY, ket_qua: ghiChu }) : apiKdt.duyetQua(xuLy.qua.id, { duyet: dongY, ly_do: ghiChu || null })
          }
          dong={() => setXuLy(null)}
          xong={() => {
            setXuLy(null);
            lamMoi();
          }}
        />
      )}
    </The>
  );
}

/** Tao moi, hoac (co `sua`) sua qua cua minh — qua bi tu choi sua xong quay lai cho tham dinh */
function HopThoaiTaoQua({ dong, xong, sua }: { dong: () => void; xong: () => void; sua?: QuaTang }) {
  const dsDoiTac = useDsDoiTac();
  const [ten, setTen] = useState(sua?.ten ?? "");
  const [moTa, setMoTa] = useState(sua?.mo_ta ?? "");
  const [hinh, setHinh] = useState(sua?.hinh_anh ?? "");
  const [giaTri, setGiaTri] = useState(sua?.gia_tri != null ? String(sua.gia_tri) : "");
  const [soLuong, setSoLuong] = useState(sua?.so_luong != null ? String(sua.so_luong) : "");
  const [doiTac, setDoiTac] = useState(sua?.doi_tac_id ?? "");
  const [hang, setHang] = useState<HangThanhVien[]>(sua?.hang_ap_dung ?? ["VIP"]);
  const tt = useThaoTac();
  const luu = async () => {
    const chung = {
      ten: ten.trim(),
      mo_ta: moTa.trim() || null,
      hinh_anh: hinh.trim() || null,
      gia_tri: giaTri ? Number(giaTri) : null,
      so_luong: soLuong ? Number(soLuong) : null,
      hang_ap_dung: hang
    };
    const r = await tt.chay(() => (sua ? apiKdt.suaQua(sua.id, chung) : apiKdt.taoQua({ ...chung, doi_tac_id: doiTac || null })));
    if (r) xong();
  };
  return (
    <HopThoai
      mo
      dong={dong}
      tieuDe={sua ? "Sửa quà tặng" : "Đề xuất quà tặng"}
      moTa={sua?.trang_thai === "TU_CHOI" ? "Sửa xong, quà quay lại chờ thẩm định từ đầu." : "Quà mới ở trạng thái chờ thẩm định — chưa hiện cho khách."}
      chanTrang={
        <>
          <Nut kieu="trong" onClick={dong}>
            Huỷ
          </Nut>
          <Nut onClick={() => void luu()} dangXuLy={tt.dangXuLy} disabled={!ten.trim()}>
            {sua ? (sua.trang_thai === "TU_CHOI" ? "Lưu & gửi lại" : "Lưu") : "Gửi đề xuất"}
          </Nut>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {tt.loi && <ThongBaoNoiDong kieu="loi">{tt.loi}</ThongBaoNoiDong>}
        <ONhap nhan="Tên quà" batBuoc value={ten} onChange={e => setTen(e.target.value)} />
        <OChon nhan="Đối tác cung cấp" value={doiTac} onChange={e => setDoiTac(e.target.value)} luaChon={dsDoiTac} disabled={!!sua} />
        <OVanBan nhan="Mô tả" rows={3} value={moTa} onChange={e => setMoTa(e.target.value)} />
        <ONhap nhan="Link hình ảnh" value={hinh} onChange={e => setHinh(e.target.value)} />
        <div className="grid gap-4 sm:grid-cols-2">
          <ONhap nhan="Giá trị (đồng)" type="number" min={0} value={giaTri} onChange={e => setGiaTri(e.target.value)} />
          <ONhap nhan="Số lượng" type="number" min={0} value={soLuong} onChange={e => setSoLuong(e.target.value)} goiY="Bỏ trống = không giới hạn" />
        </div>
        <ChonHang ds={hang} doi={setHang} />
      </div>
    </HopThoai>
  );
}

/** Hop thoai dong y / tu choi kem ghi chu (tham dinh, duyet) */
function HopThoaiXuLy({
  tieuDe,
  moTa,
  nhanDong,
  nhanKhong,
  batBuocGhiChu,
  gui,
  dong,
  xong
}: {
  tieuDe: string;
  moTa?: string;
  nhanDong: string;
  nhanKhong: string;
  batBuocGhiChu: boolean;
  gui: (dongY: boolean, ghiChu: string) => Promise<unknown>;
  dong: () => void;
  xong: () => void;
}) {
  const [ghiChu, setGhiChu] = useState("");
  const tt = useThaoTac();
  const chay = async (dongY: boolean) => {
    if ((batBuocGhiChu || !dongY) && !ghiChu.trim()) {
      tt.datLoi(dongY ? "Cần ghi kết quả thẩm định" : "Cần ghi lý do");
      return;
    }
    if (await tt.chay(() => gui(dongY, ghiChu.trim()))) xong();
  };
  return (
    <HopThoai
      mo
      dong={dong}
      tieuDe={tieuDe}
      moTa={moTa}
      chanTrang={
        <>
          <Nut kieu="nguy-hiem" onClick={() => void chay(false)} disabled={tt.dangXuLy}>
            {nhanKhong}
          </Nut>
          <Nut onClick={() => void chay(true)} dangXuLy={tt.dangXuLy}>
            {nhanDong}
          </Nut>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {tt.loi && <ThongBaoNoiDong kieu="loi">{tt.loi}</ThongBaoNoiDong>}
        <OVanBan nhan={batBuocGhiChu ? "Kết quả / nhận xét" : "Ghi chú (bắt buộc khi từ chối)"} rows={3} value={ghiChu} onChange={e => setGhiChu(e.target.value)} />
      </div>
    </HopThoai>
  );
}

/** Hop thoai xac nhan huy / ngung (ngung bat buoc ghi ly do) */
function HopThoaiHanhDong({
  tieuDe,
  moTa,
  nhanNut,
  canLyDo,
  chay,
  dong,
  xong
}: {
  tieuDe: string;
  moTa: string;
  nhanNut: string;
  canLyDo: boolean;
  chay: (lyDo: string) => Promise<unknown>;
  dong: () => void;
  xong: () => void;
}) {
  const [lyDo, setLyDo] = useState("");
  const tt = useThaoTac();
  const gui = async () => {
    if (canLyDo && !lyDo.trim()) {
      tt.datLoi("Cần ghi lý do");
      return;
    }
    if (await tt.chay(() => chay(lyDo.trim()))) xong();
  };
  return (
    <HopThoai
      mo
      dong={dong}
      tieuDe={tieuDe}
      moTa={moTa}
      chanTrang={
        <>
          <Nut kieu="trong" onClick={dong}>
            Không
          </Nut>
          <Nut kieu="nguy-hiem" onClick={() => void gui()} dangXuLy={tt.dangXuLy}>
            {nhanNut}
          </Nut>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {tt.loi && <ThongBaoNoiDong kieu="loi">{tt.loi}</ThongBaoNoiDong>}
        {canLyDo && <OVanBan nhan="Lý do (bắt buộc)" rows={3} value={lyDo} onChange={e => setLyDo(e.target.value)} />}
      </div>
    </HopThoai>
  );
}

// ------------------------------------------------------------------ voucher

function DanhSachVoucher({ phienBan, lamMoi }: { phienBan: number; lamMoi: () => void }) {
  const { nguoiDung } = useXacThuc();
  const [trang, setTrang] = useState(1);
  const ds = useTai(() => apiKdt.dsVoucher({ trang }), [trang, phienBan]);
  const [taoMo, setTaoMo] = useState(false);
  const [duyet, setDuyet] = useState<Voucher | null>(null);
  const [sua, setSua] = useState<Voucher | null>(null);
  const [hanhDong, setHanhDong] = useState<{ loai: "huy" | "ngung"; v: Voucher } | null>(null);
  const toi = nguoiDung?.id;
  return (
    <The>
      <TheTieuDe
        kicker="Voucher"
        tieuDe="Voucher theo hạng"
        moTa="Voucher mới chờ Thiên Khuê duyệt; người tạo không tự duyệt."
        hanhDong={
          <Nut co="nho" onClick={() => setTaoMo(true)}>
            Tạo voucher
          </Nut>
        }
      />
      {ds.dangTai && !ds.data ? (
        <DangTai />
      ) : ds.loi ? (
        <Loi chiTiet={ds.loi} thuLai={() => void ds.taiLai()} />
      ) : (
        <>
          <Bang
            dong={ds.data?.data ?? []}
            khoaDong={v => v.id}
            cot={[
              { khoa: "ma", tieuDe: "Mã", hienThi: v => <span className="flex flex-col"><code className="font-semibold text-chinh">{v.ma}</code><span className="text-sm text-chu-phu">{v.ten}</span></span> },
              { khoa: "giam", tieuDe: "Ưu đãi", hienThi: v => moTaGiam(v.loai_giam, v.gia_tri) },
              { khoa: "hang", tieuDe: "Hạng", hienThi: v => <NhanHangApDung ds={v.hang_ap_dung} /> },
              { khoa: "cap", tieuDe: "Đã cấp", canPhai: true, hienThi: v => `${v.da_cap}${v.so_luong ? `/${v.so_luong}` : ""}` },
              { khoa: "han", tieuDe: "Hết hạn", hienThi: v => (v.het_han ? dinhDangNgay(v.het_han) : "—") },
              { khoa: "tt", tieuDe: "Trạng thái", hienThi: v => <NhanDuyet tt={v.trang_thai} /> },
              {
                khoa: "tac",
                tieuDe: "",
                canPhai: true,
                hienThi: v => {
                  const laNguoiTao = !!toi && v.nguoi_de_xuat_id === toi;
                  const suaDuoc = laNguoiTao && v.trang_thai !== "DA_DUYET";
                  const duyetDuoc = v.trang_thai === "CHO_THAM_DINH" && laThienKhueThat(nguoiDung);
                  const ngungDuoc = v.trang_thai === "DA_DUYET" && laThienKhueThat(nguoiDung) && (!v.het_han || new Date(v.het_han) > new Date());
                  if (!suaDuoc && !duyetDuoc && !ngungDuoc) return null;
                  return (
                    <span className="flex flex-wrap items-center justify-end gap-2">
                      {suaDuoc && (
                        <>
                          <Nut co="nho" kieu="vien" onClick={() => setSua(v)}>
                            {v.trang_thai === "TU_CHOI" ? "Sửa & gửi lại" : "Sửa"}
                          </Nut>
                          <Nut co="nho" kieu="vien-loi" onClick={() => setHanhDong({ loai: "huy", v })}>
                            Huỷ
                          </Nut>
                        </>
                      )}
                      {duyetDuoc && (
                        <Nut co="nho" onClick={() => setDuyet(v)}>
                          Duyệt
                        </Nut>
                      )}
                      {ngungDuoc && (
                        <Nut co="nho" kieu="vien-loi" onClick={() => setHanhDong({ loai: "ngung", v })}>
                          Ngừng áp dụng
                        </Nut>
                      )}
                    </span>
                  );
                }
              }
            ]}
            rong={<p className="m-0 text-sm text-chu-phu">Chưa có voucher.</p>}
          />
          <PhanTrangGon trang={trang} tongTrang={ds.data?.meta?.tong_trang ?? 1} doi={setTrang} />
        </>
      )}
      {taoMo && (
        <HopThoaiTaoVoucher
          dong={() => setTaoMo(false)}
          xong={() => {
            setTaoMo(false);
            lamMoi();
          }}
        />
      )}
      {sua && (
        <HopThoaiTaoVoucher
          sua={sua}
          dong={() => setSua(null)}
          xong={() => {
            setSua(null);
            lamMoi();
          }}
        />
      )}
      {hanhDong && (
        <HopThoaiHanhDong
          tieuDe={hanhDong.loai === "huy" ? `Huỷ voucher ${hanhDong.v.ma}` : `Ngừng áp dụng voucher ${hanhDong.v.ma}`}
          moTa={hanhDong.loai === "huy" ? "Voucher sẽ bị xoá. Không hoàn tác được." : "Voucher hết hiệu lực ngay: không hiện cho khách, không cấp thêm. Lượt đã cấp vẫn giữ trong lịch sử."}
          nhanNut={hanhDong.loai === "huy" ? "Huỷ voucher" : "Ngừng áp dụng"}
          canLyDo={hanhDong.loai === "ngung"}
          chay={lyDo => (hanhDong.loai === "huy" ? apiKdt.huyVoucher(hanhDong.v.id) : apiKdt.ngungVoucher(hanhDong.v.id, { ly_do: lyDo }))}
          dong={() => setHanhDong(null)}
          xong={() => {
            setHanhDong(null);
            lamMoi();
          }}
        />
      )}
      {duyet && (
        <HopThoaiXuLy
          tieuDe={`Duyệt voucher ${duyet.ma}`}
          moTa={`${duyet.ten} — ${moTaGiam(duyet.loai_giam, duyet.gia_tri)}`}
          nhanDong="Duyệt"
          nhanKhong="Từ chối"
          batBuocGhiChu={false}
          gui={(dongY, ghiChu) => apiKdt.duyetVoucher(duyet.id, { duyet: dongY, ly_do: ghiChu || null })}
          dong={() => setDuyet(null)}
          xong={() => {
            setDuyet(null);
            lamMoi();
          }}
        />
      )}
    </The>
  );
}

/** Ngay (YYYY-MM-DD) theo gio Viet Nam, de do vao o `type=date` */
const ngayVn = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleDateString("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" }) : "");

/** Tao moi, hoac (co `sua`) sua voucher cua minh — ma giu nguyen; voucher bi tu choi sua xong quay lai cho duyet */
function HopThoaiTaoVoucher({ dong, xong, sua }: { dong: () => void; xong: () => void; sua?: Voucher }) {
  const dsDoiTac = useDsDoiTac();
  const [ma, setMa] = useState(sua?.ma ?? "");
  const [ten, setTen] = useState(sua?.ten ?? "");
  const [loai, setLoai] = useState<"PHAN_TRAM" | "SO_TIEN">(sua?.loai_giam ?? "PHAN_TRAM");
  const [giaTri, setGiaTri] = useState(sua ? String(sua.gia_tri) : "");
  const [donToiThieu, setDonToiThieu] = useState(sua?.don_toi_thieu != null ? String(sua.don_toi_thieu) : "");
  const [soLuong, setSoLuong] = useState(sua?.so_luong != null ? String(sua.so_luong) : "");
  const [hetHan, setHetHan] = useState(ngayVn(sua?.het_han));
  const [doiTac, setDoiTac] = useState(sua?.doi_tac_id ?? "");
  const [hang, setHang] = useState<HangThanhVien[]>(sua?.hang_ap_dung ?? ["VIP"]);
  const tt = useThaoTac();
  const luu = async () => {
    const chung = {
      ten: ten.trim(),
      loai_giam: loai,
      gia_tri: Number(giaTri),
      don_toi_thieu: donToiThieu ? Number(donToiThieu) : null,
      so_luong: soLuong ? Number(soLuong) : null,
      // Giu nguyen han cu neu nguoi dung khong doi ngay (tranh lam tron lai thanh 23:59:59)
      het_han: !hetHan ? null : hetHan === ngayVn(sua?.het_han) ? sua!.het_han : new Date(`${hetHan}T23:59:59+07:00`).toISOString(),
      hang_ap_dung: hang
    };
    const r = await tt.chay(() => (sua ? apiKdt.suaVoucher(sua.id, chung) : apiKdt.taoVoucher({ ...chung, ma: ma.trim().toUpperCase(), doi_tac_id: doiTac || null })));
    if (r) xong();
  };
  return (
    <HopThoai
      mo
      dong={dong}
      rong="lon"
      tieuDe={sua ? `Sửa voucher ${sua.ma}` : "Tạo voucher"}
      moTa={sua?.trang_thai === "TU_CHOI" ? "Sửa xong, voucher quay lại chờ Thiên Khuê duyệt." : undefined}
      chanTrang={
        <>
          <Nut kieu="trong" onClick={dong}>
            Huỷ
          </Nut>
          <Nut onClick={() => void luu()} dangXuLy={tt.dangXuLy} disabled={!ma.trim() || !ten.trim() || !giaTri}>
            {sua ? (sua.trang_thai === "TU_CHOI" ? "Lưu & gửi lại" : "Lưu") : "Tạo (chờ duyệt)"}
          </Nut>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {tt.loi && <ThongBaoNoiDong kieu="loi">{tt.loi}</ThongBaoNoiDong>}
        <div className="grid gap-4 sm:grid-cols-2">
          <ONhap nhan="Mã" batBuoc value={ma} onChange={e => setMa(e.target.value.toUpperCase())} placeholder="VIP10-TET" disabled={!!sua} goiY={sua ? "Không đổi được mã" : undefined} />
          <ONhap nhan="Tên" batBuoc value={ten} onChange={e => setTen(e.target.value)} />
          <OChon
            nhan="Kiểu giảm"
            value={loai}
            onChange={e => setLoai(e.target.value as "PHAN_TRAM" | "SO_TIEN")}
            luaChon={[
              { giaTri: "PHAN_TRAM", nhan: "Phần trăm" },
              { giaTri: "SO_TIEN", nhan: "Số tiền" }
            ]}
          />
          <ONhap nhan={loai === "PHAN_TRAM" ? "Giảm (%)" : "Giảm (đồng)"} type="number" min={0} max={loai === "PHAN_TRAM" ? 100 : undefined} batBuoc value={giaTri} onChange={e => setGiaTri(e.target.value)} />
          <ONhap nhan="Đơn tối thiểu (đồng)" type="number" min={0} value={donToiThieu} onChange={e => setDonToiThieu(e.target.value)} />
          <ONhap nhan="Số lượng" type="number" min={1} value={soLuong} onChange={e => setSoLuong(e.target.value)} goiY="Bỏ trống = không giới hạn" />
          <ONhap nhan="Hết hạn" type="date" value={hetHan} onChange={e => setHetHan(e.target.value)} />
          <OChon nhan="Đối tác" value={doiTac} onChange={e => setDoiTac(e.target.value)} luaChon={dsDoiTac} disabled={!!sua} />
        </div>
        <ChonHang ds={hang} doi={setHang} />
      </div>
    </HopThoai>
  );
}

// ------------------------------------------------------------------ cap phat

function CapPhat({ phienBan, sauKhiCap }: { phienBan: number; sauKhiCap: () => void }) {
  const { coVai } = useXacThuc();
  const quaDuyet = useTai(() => apiKdt.dsQua({ trang_thai: "DA_DUYET" }), [phienBan]);
  const voucherDuyet = useTai(() => apiKdt.dsVoucher({ trang_thai: "DA_DUYET" }), [phienBan]);
  const [uuDai, setUuDai] = useState("");
  const [sdt, setSdt] = useState("");
  const [hang, setHang] = useState<HangThanhVien>("VIP");
  const [locSdt, setLocSdt] = useState("");
  const [locTT, setLocTT] = useState("");
  const [trang, setTrang] = useState(1);
  const ds = useTai(() => apiKdt.dsCapPhat({ trang, sdt: locSdt || undefined, trang_thai: locTT || undefined }), [trang, locSdt, locTT, phienBan]);
  const tt = useThaoTac();
  const [thongBao, setThongBao] = useState<string | null>(null);

  const luaChon = [
    { giaTri: "", nhan: "— Chọn ưu đãi đã duyệt —" },
    ...(voucherDuyet.data?.data ?? []).map(v => ({ giaTri: `v:${v.id}`, nhan: `Voucher ${v.ma} · ${moTaGiam(v.loai_giam, v.gia_tri)}` })),
    ...(quaDuyet.data?.data ?? []).map(q => ({ giaTri: `q:${q.id}`, nhan: `Quà: ${q.ten}` }))
  ];
  const chon = () => (uuDai.startsWith("v:") ? { voucher_id: uuDai.slice(2) } : uuDai.startsWith("q:") ? { qua_tang_id: uuDai.slice(2) } : null);

  const capMot = async () => {
    const c = chon();
    if (!c) return;
    setThongBao(null);
    const r = await tt.chay(() => apiKdt.capPhat({ sdt, ...c }));
    if (r) {
      setThongBao(`Đã cấp cho ${r.sdt_chuan}.`);
      setSdt("");
      sauKhiCap();
    }
  };
  const capTheoHang = async () => {
    const c = chon();
    if (!c) return;
    setThongBao(null);
    const r = await tt.chay(() => apiKdt.capPhatTheoHang({ hang, ...c }));
    if (r) {
      setThongBao(`Hạng ${NHAN_HANG_THANH_VIEN[hang]}: ${r.so_khach_du_hang} khách — đã cấp ${r.da_cap}, bỏ qua ${r.bo_qua_da_co} đã có, ${r.bo_qua_het_so_luong} do hết số lượng.`);
      sauKhiCap();
    }
  };
  const doiTT = async (id: string, trangThai: "DA_DUNG" | "HUY") => {
    if (await tt.chay(() => apiKdt.capNhatCapPhat(id, { trang_thai: trangThai }))) sauKhiCap();
  };

  return (
    <The>
      <TheTieuDe kicker="Cấp phát" tieuDe="Cấp ưu đãi theo hạng" moTa="Chỉ cấp được ưu đãi đã duyệt, đúng hạng hiện tại của khách (tính lại từ CRM lúc cấp)." />
      {tt.loi && <ThongBaoNoiDong kieu="loi" className="mb-4">{tt.loi}</ThongBaoNoiDong>}
      {thongBao && <ThongBaoNoiDong kieu="thanh-cong" className="mb-4">{thongBao}</ThongBaoNoiDong>}
      <div className="flex flex-col gap-4">
        <OChon nhan="Ưu đãi" value={uuDai} onChange={e => setUuDai(e.target.value)} luaChon={luaChon} />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-wrap items-end gap-3">
            <ONhap nhan="Cấp cho một khách (SĐT)" type="tel" value={sdt} onChange={e => setSdt(e.target.value)} lopKhung="min-w-[200px] flex-1" />
            <Nut kieu="vien" onClick={() => void capMot()} disabled={!uuDai || !sdt.trim() || tt.dangXuLy}>
              Cấp
            </Nut>
          </div>
          {coVai("QUAN_LY") && (
            <div className="flex flex-wrap items-end gap-3">
              <OChon
                nhan="Cấp cho cả hạng"
                value={hang}
                onChange={e => setHang(e.target.value as HangThanhVien)}
                luaChon={DANH_SACH_HANG_THANH_VIEN.map(h => ({ giaTri: h, nhan: NHAN_HANG_THANH_VIEN[h] }))}
                lopKhung="min-w-[200px] flex-1"
              />
              <Nut onClick={() => void capTheoHang()} disabled={!uuDai || tt.dangXuLy}>
                Cấp cả hạng
              </Nut>
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 flex flex-wrap items-end justify-between gap-3">
        <h4 className="m-0 text-h2">Lượt đã cấp</h4>
        <div className="flex flex-wrap gap-3">
          <ONhap
            aria-label="Lọc theo SĐT"
            placeholder="Lọc SĐT"
            value={locSdt}
            onChange={e => {
              setLocSdt(e.target.value);
              setTrang(1);
            }}
            lopKhung="w-[180px]"
          />
          <OChon
            aria-label="Lọc trạng thái"
            value={locTT}
            onChange={e => {
              setLocTT(e.target.value);
              setTrang(1);
            }}
            luaChon={[{ giaTri: "", nhan: "Mọi trạng thái" }, ...DANH_SACH_TRANG_THAI_CAP_PHAT.map(t => ({ giaTri: t, nhan: NHAN_TRANG_THAI_CAP_PHAT[t] }))]}
          />
        </div>
      </div>
      <div className="mt-4">
        {ds.dangTai && !ds.data ? (
          <DangTai />
        ) : ds.loi ? (
          <Loi chiTiet={ds.loi} thuLai={() => void ds.taiLai()} />
        ) : (
          <>
            <Bang
              dong={ds.data?.data ?? []}
              khoaDong={c => c.id}
              cot={[
                { khoa: "sdt", tieuDe: "Khách", hienThi: c => c.sdt_chuan },
                { khoa: "uu_dai", tieuDe: "Ưu đãi", hienThi: c => <span className="flex flex-col"><span>{c.ten_uu_dai ?? "—"}</span>{c.ma_voucher && <code className="text-xs text-chinh">{c.ma_voucher}</code>}</span> },
                { khoa: "luc", tieuDe: "Cấp lúc", hienThi: c => dinhDangNgayGio(c.cap_luc) },
                { khoa: "tt", tieuDe: "Trạng thái", hienThi: c => <NhanCapPhat tt={c.trang_thai} /> },
                {
                  khoa: "tac",
                  tieuDe: "",
                  canPhai: true,
                  hienThi: c =>
                    c.trang_thai === "DA_CAP" ? (
                      <span className="flex justify-end gap-2">
                        <Nut co="nho" kieu="vien" onClick={() => void doiTT(c.id, "DA_DUNG")} disabled={tt.dangXuLy}>
                          Đã dùng
                        </Nut>
                        <Nut co="nho" kieu="trong" onClick={() => void doiTT(c.id, "HUY")} disabled={tt.dangXuLy}>
                          Huỷ
                        </Nut>
                      </span>
                    ) : null
                }
              ]}
              rong={<p className="m-0 text-sm text-chu-phu">Chưa có lượt cấp.</p>}
            />
            <PhanTrangGon trang={trang} tongTrang={ds.data?.meta?.tong_trang ?? 1} doi={setTrang} />
          </>
        )}
      </div>
    </The>
  );
}
