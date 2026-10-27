"use client";

import type { KhoaHocQuanTri, LoaiKhoaHoc, TaoKhoaHocBody, Vai } from "@thien-khue/contracts";
import { DANH_SACH_LOAI_KHOA_HOC, NHAN_LOAI_KHOA_HOC, NHAN_VAI } from "@thien-khue/contracts";
import Link from "next/link";
import { useState } from "react";
import { Bang, DangTai, HopThoai, Loi, Nhan, Nut, OChon, ONhap, OVanBan, ThongBaoNoiDong, TieuDeTrang, Trong } from "@/components/ui";
import { BoLoc, PhanTrang, useTaiDuLieu } from "@/features/quan-tri/dung-chung";
import { thongDiepLoi } from "@/lib/api";
import { quanTriNoiDungApi } from "./quan-tri-noi-dung-api";

/*
 * Quan tri khoa hoc (QUAN_LY): danh sach + tao / sua / tat-bat khoa. Soan bai hoc, de, cau hoi o trang chi tiet.
 * API: /api/dao-tao/quan-tri/khoa-hoc. Luat noi cong hoc (tat de, bo bat_buoc, bo thuc hanh) chi THIEN_KHUE — server tra 403 kem huong dan.
 */

const VAI_CHON: Vai[] = ["SALE", "CSKH", "CTV", "THUC_TAP", "KOL", "KOC", "MENTOR", "QUAN_LY"];

type LocBat = "TAT_CA" | "BAT" | "TAT";

interface FormKhoa {
  ma: string;
  ten: string;
  mo_ta: string;
  loai: LoaiKhoaHoc;
  vai_ap_dung: Vai[];
  ma_mau: string;
  bat_buoc: boolean;
  can_thuc_hanh: boolean;
  yeu_cau_thuc_hanh: string;
  thu_tu: string;
}

const FORM_MOI: FormKhoa = {
  ma: "",
  ten: "",
  mo_ta: "",
  loai: "NGHIEP_VU",
  vai_ap_dung: [],
  ma_mau: "",
  bat_buoc: true,
  can_thuc_hanh: false,
  yeu_cau_thuc_hanh: "",
  thu_tu: "0"
};

function formTuKhoa(k: KhoaHocQuanTri): FormKhoa {
  return {
    ma: k.ma,
    ten: k.ten,
    mo_ta: k.mo_ta ?? "",
    loai: k.loai,
    vai_ap_dung: k.vai_ap_dung,
    ma_mau: k.ma_mau ?? "",
    bat_buoc: k.bat_buoc,
    can_thuc_hanh: k.can_thuc_hanh,
    yeu_cau_thuc_hanh: k.yeu_cau_thuc_hanh ?? "",
    thu_tu: String(k.thu_tu)
  };
}

/** Hop thoai tao / sua khoa (khoa = null -> tao moi). Dung lai o trang chi tiet; truyen `key` moi moi lan mo de nap lai form. */
export function HopThoaiKhoa({ khoa, dong, xong }: { khoa: KhoaHocQuanTri | null; dong: () => void; xong: (k: KhoaHocQuanTri) => void }) {
  const [f, setF] = useState<FormKhoa>(khoa ? formTuKhoa(khoa) : FORM_MOI);
  const [dangLuu, setDangLuu] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);
  const sua = khoa !== null;
  const dat = <K extends keyof FormKhoa>(k: K, v: FormKhoa[K]) => setF(c => ({ ...c, [k]: v }));

  const luu = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.vai_ap_dung.length) return setLoi("Chọn ít nhất một vai áp dụng");
    if (!sua && f.loai === "SAN_PHAM" && !f.ma_mau.trim()) return setLoi("Khóa Sản phẩm cần mã mẫu (vd AL01)");
    setDangLuu(true);
    setLoi(null);
    try {
      const chung = {
        ma: f.ma.trim(),
        ten: f.ten.trim(),
        mo_ta: f.mo_ta.trim() || undefined,
        vai_ap_dung: f.vai_ap_dung,
        bat_buoc: f.bat_buoc,
        can_thuc_hanh: f.can_thuc_hanh,
        yeu_cau_thuc_hanh: f.yeu_cau_thuc_hanh.trim() || undefined,
        thu_tu: Number(f.thu_tu) || 0
      };
      const kq = sua
        ? await quanTriNoiDungApi.suaKhoa(khoa.id, chung)
        : await quanTriNoiDungApi.taoKhoa({ ...chung, loai: f.loai, ma_mau: f.loai === "SAN_PHAM" ? f.ma_mau.trim() : undefined } satisfies TaoKhoaHocBody);
      xong(kq);
    } catch (er) {
      setLoi(thongDiepLoi(er));
    } finally {
      setDangLuu(false);
    }
  };

  return (
    <HopThoai
      mo
      dong={dong}
      rong="lon"
      tieuDe={sua ? `Sửa khóa: ${khoa.ten}` : "Tạo khóa học"}
      chanTrang={
        <>
          <Nut kieu="vien" onClick={dong} type="button">
            Hủy
          </Nut>
          <Nut type="submit" form="form-khoa" dangXuLy={dangLuu} disabled={dangLuu}>
            {sua ? "Lưu thay đổi" : "Tạo khóa"}
          </Nut>
        </>
      }
    >
      <form id="form-khoa" onSubmit={luu} className="flex flex-col gap-4">
        {loi && <ThongBaoNoiDong kieu="loi">{loi}</ThongBaoNoiDong>}
        <div className="grid gap-4 sm:grid-cols-2">
          <ONhap nhan="Tên khóa" batBuoc value={f.ten} onChange={e => dat("ten", e.target.value)} maxLength={200} />
          <ONhap nhan="Mã khóa" batBuoc value={f.ma} onChange={e => dat("ma", e.target.value)} maxLength={80} goiY="Chữ không dấu, số, gạch nối (vd sale-co-ban)" />
        </div>
        <OVanBan nhan="Mô tả" rows={3} value={f.mo_ta} onChange={e => dat("mo_ta", e.target.value)} maxLength={5000} />
        <div className="grid gap-4 sm:grid-cols-2">
          <OChon
            nhan="Loại khóa"
            value={f.loai}
            disabled={sua}
            goiY={sua ? "Không đổi được loại sau khi tạo" : undefined}
            onChange={e => dat("loai", e.target.value as LoaiKhoaHoc)}
            luaChon={DANH_SACH_LOAI_KHOA_HOC.map(l => ({ giaTri: l, nhan: NHAN_LOAI_KHOA_HOC[l] }))}
          />
          {f.loai === "SAN_PHAM" && (
            <ONhap nhan="Mã mẫu sản phẩm (CRM)" batBuoc={!sua} disabled={sua} value={f.ma_mau} onChange={e => dat("ma_mau", e.target.value)} goiY="Mã trong danh mục mẫu của CRM, vd AL01" />
          )}
          <ONhap nhan="Thứ tự hiển thị" type="number" min={0} value={f.thu_tu} onChange={e => dat("thu_tu", e.target.value)} />
        </div>

        <fieldset className="flex flex-col gap-2 border-0 p-0">
          <legend className="mb-1 text-sm font-medium text-chu">
            Vai áp dụng <span className="text-loi">*</span>
          </legend>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {VAI_CHON.map(v => (
              <label key={v} className="inline-flex cursor-pointer items-center gap-2 text-sm text-chu">
                <input
                  type="checkbox"
                  checked={f.vai_ap_dung.includes(v)}
                  onChange={e => dat("vai_ap_dung", e.target.checked ? [...f.vai_ap_dung, v] : f.vai_ap_dung.filter(x => x !== v))}
                />
                {NHAN_VAI[v]}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-chu">
            <input type="checkbox" checked={f.bat_buoc} onChange={e => dat("bat_buoc", e.target.checked)} />
            Khóa bắt buộc
          </label>
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-chu">
            <input type="checkbox" checked={f.can_thuc_hanh} onChange={e => dat("can_thuc_hanh", e.target.checked)} />
            Cần nộp bài thực hành được duyệt
          </label>
        </div>
        {f.can_thuc_hanh && (
          <OVanBan nhan="Yêu cầu bài thực hành" rows={3} value={f.yeu_cau_thuc_hanh} onChange={e => dat("yeu_cau_thuc_hanh", e.target.value)} maxLength={5000} />
        )}
      </form>
    </HopThoai>
  );
}

export function ManQuanTriKhoa() {
  const [loaiLoc, setLoaiLoc] = useState<"TAT_CA" | LoaiKhoaHoc>("TAT_CA");
  const [locBat, setLocBat] = useState<LocBat>("TAT_CA");
  const [tuKhoa, setTuKhoa] = useState("");
  const [trang, setTrang] = useState(1);
  const [dang, setDang] = useState<{ khoa: KhoaHocQuanTri | null; lan: number } | null>(null);
  const [thongBao, setThongBao] = useState<string | null>(null);
  const [loiThaoTac, setLoiThaoTac] = useState<string | null>(null);

  const ds = useTaiDuLieu(
    () =>
      quanTriNoiDungApi.dsKhoa({
        trang,
        so_dong: 30,
        loai: loaiLoc === "TAT_CA" ? undefined : loaiLoc,
        tu_khoa: tuKhoa.trim() || undefined,
        bat: locBat === "TAT_CA" ? undefined : locBat === "BAT"
      }),
    [trang, loaiLoc, locBat, tuKhoa]
  );

  const batTat = async (k: KhoaHocQuanTri) => {
    setLoiThaoTac(null);
    try {
      if (k.bat) await quanTriNoiDungApi.tatKhoa(k.id);
      else await quanTriNoiDungApi.suaKhoa(k.id, { bat: true });
      setThongBao(k.bat ? `Đã tắt khóa "${k.ten}"` : `Đã bật lại khóa "${k.ten}"`);
      void ds.taiLai();
    } catch (e) {
      setLoiThaoTac(thongDiepLoi(e));
    }
  };

  const dsKhoa = ds.duLieu?.data ?? [];

  return (
    <div className="flex flex-col gap-6 [&>header]:mb-0">
      <TieuDeTrang
        kicker="Học viện"
        tieuDe="Quản trị khóa học"
        moTa="Tạo khóa, soạn bài học, bài kiểm tra và câu hỏi. Khóa bị tắt sẽ ẩn khỏi học viên nhưng giữ nguyên dữ liệu học."
        hanhDong={<Nut onClick={() => setDang({ khoa: null, lan: Date.now() })}>Tạo khóa học</Nut>}
      />

      {thongBao && <ThongBaoNoiDong kieu="thanh-cong">{thongBao}</ThongBaoNoiDong>}
      {loiThaoTac && <ThongBaoNoiDong kieu="loi">{loiThaoTac}</ThongBaoNoiDong>}

      <div className="flex flex-wrap items-end gap-4">
        <BoLoc
          nhanAria="Lọc theo loại khóa"
          giaTri={loaiLoc}
          doi={v => {
            setLoaiLoc(v);
            setTrang(1);
          }}
          luaChon={[{ giaTri: "TAT_CA", nhan: "Tất cả loại" }, ...DANH_SACH_LOAI_KHOA_HOC.map(l => ({ giaTri: l, nhan: NHAN_LOAI_KHOA_HOC[l] }))]}
        />
        <BoLoc
          nhanAria="Lọc theo trạng thái"
          giaTri={locBat}
          doi={v => {
            setLocBat(v);
            setTrang(1);
          }}
          luaChon={[
            { giaTri: "TAT_CA", nhan: "Cả bật và tắt" },
            { giaTri: "BAT", nhan: "Đang bật" },
            { giaTri: "TAT", nhan: "Đã tắt" }
          ]}
        />
        <ONhap
          aria-label="Tìm khóa"
          placeholder="Tìm theo tên / mã…"
          value={tuKhoa}
          onChange={e => {
            setTuKhoa(e.target.value);
            setTrang(1);
          }}
          lopKhung="w-full sm:w-64"
        />
      </div>

      {ds.loi ? (
        <Loi chiTiet={ds.loi} thuLai={() => void ds.taiLai()} />
      ) : !ds.duLieu ? (
        <DangTai />
      ) : (
        <>
          <Bang
            dong={dsKhoa}
            khoaDong={k => k.id}
            rong={<Trong tieuDe="Chưa có khóa học nào" moTa="Bấm “Tạo khóa học” để bắt đầu." />}
            cot={[
              {
                khoa: "ten",
                tieuDe: "Khóa học",
                hienThi: k => (
                  <div className="flex flex-col">
                    <Link href={`/hoc-vien/quan-tri/khoa-hoc/${k.id}`} className="font-medium text-chu hover:underline">
                      {k.ten}
                    </Link>
                    <span className="text-xs text-chu-mo">{k.ma}</span>
                  </div>
                )
              },
              { khoa: "loai", tieuDe: "Loại", hienThi: k => NHAN_LOAI_KHOA_HOC[k.loai] },
              { khoa: "vai", tieuDe: "Vai áp dụng", hienThi: k => k.vai_ap_dung.map(v => NHAN_VAI[v]).join(", ") },
              { khoa: "bai", tieuDe: "Bài học", canPhai: true, hienThi: k => k.so_bai },
              { khoa: "de", tieuDe: "Bài KT", canPhai: true, hienThi: k => k.so_bai_kiem_tra },
              { khoa: "hv", tieuDe: "Học viên", canPhai: true, hienThi: k => k.so_hoc_vien },
              { khoa: "tt", tieuDe: "Trạng thái", hienThi: k => <Nhan tong={k.bat ? "thanh-cong" : "trung-tinh"}>{k.bat ? "Đang bật" : "Đã tắt"}</Nhan> },
              {
                khoa: "tac",
                tieuDe: "",
                canPhai: true,
                hienThi: k => (
                  <div className="flex justify-end gap-2">
                    <Nut kieu="vien" co="nho" onClick={() => setDang({ khoa: k, lan: Date.now() })}>
                      Sửa
                    </Nut>
                    <Nut kieu={k.bat ? "vien-loi" : "vien"} co="nho" onClick={() => void batTat(k)}>
                      {k.bat ? "Tắt" : "Bật lại"}
                    </Nut>
                  </div>
                )
              }
            ]}
          />
          <PhanTrang meta={ds.duLieu.meta} doiTrang={setTrang} />
        </>
      )}

      {dang && (
        <HopThoaiKhoa
          key={dang.lan}
          khoa={dang.khoa}
          dong={() => setDang(null)}
          xong={k => {
            setDang(null);
            setThongBao(dang.khoa ? `Đã lưu khóa "${k.ten}"` : `Đã tạo khóa "${k.ten}" — bấm tên khóa để soạn bài học và bài kiểm tra`);
            void ds.taiLai();
          }}
        />
      )}
    </div>
  );
}
