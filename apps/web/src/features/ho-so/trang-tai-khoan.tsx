"use client";

import {
  NHAN_TRANG_THAI_VAI,
  NHAN_VAI,
  trangThaiKichHoatLamViec,
  VAI_CHUYEN_TU_THUC_TAP,
  type CapNhatHoSoBody,
  type DangKyThemVaiBody,
  type DeXuatChuyenVai,
  type DeXuatChuyenVaiBody,
  type DieuKienKichHoat,
  type HoSoCuaToi,
  type LichSuVai,
  type TrangThaiVai,
  type Vai
} from "@thien-khue/contracts";
import { useCallback, useEffect, useState } from "react";
import {
  Bang,
  DangTai,
  Loi,
  lopTab,
  lopThanhTab,
  Nhan,
  Nut,
  NutLienKet,
  OChon,
  ONhap,
  OVanBan,
  The,
  TheTieuDe,
  ThongBaoNoiDong,
  TieuDeTrang,
  type TongNhan
} from "@/components/ui";
import { api, LoiApi, thongDiepLoi } from "@/lib/api";
import { cn } from "@/lib/cn";
import { chuCaiDau, dinhDangNgay, dinhDangNgayGio } from "@/lib/dinh-dang";
import { useXacThuc } from "@/providers/auth-provider";
import { TRANG_CUA_VAI, useVaiDangDung } from "./use-vai-dang-dung";

/*
 * /tai-khoan — ho so cua toi, cac vai + lich su chuyen vai, chon vai dang dung, kich hoat khi hoc dat,
 * dang ky them vai, de xuat chuyen vai (thuc tap sinh), quyen SKU tom tat. Moi du lieu tu /api/ho-so/toi/*.
 */

const TONG_TRANG_THAI: Record<TrangThaiVai, TongNhan> = { DANG_HOC: "chinh", HOAT_DONG: "thanh-cong", TAM_DUNG: "canh-bao", KET_THUC: "trung-tinh" };
const VAI_TU_DANG_KY: DangKyThemVaiBody["vai"][] = ["CTV", "THUC_TAP", "KOL", "KOC"];

function NhanTrangThai({ tt }: { tt: TrangThaiVai | null }) {
  if (!tt) return <span className="text-chu-mo">—</span>;
  return <Nhan tong={TONG_TRANG_THAI[tt]}>{NHAN_TRANG_THAI_VAI[tt]}</Nhan>;
}

/** Loi API kem danh sach chi tiet (details: string[]) */
function LoiChiTiet({ loi }: { loi: unknown }) {
  if (!loi) return null;
  const ds = loi instanceof LoiApi && Array.isArray(loi.details) ? (loi.details as unknown[]).map(String) : [];
  return (
    <ThongBaoNoiDong kieu="canh-bao">
      {thongDiepLoi(loi)}
      {ds.length > 0 && (
        <ul className="mb-0 mt-2 list-disc pl-5">
          {ds.map(d => (
            <li key={d}>{d}</li>
          ))}
        </ul>
      )}
    </ThongBaoNoiDong>
  );
}

interface DuLieu {
  toi: HoSoCuaToi;
  dieuKien: DieuKienKichHoat[];
  lichSu: LichSuVai[];
  deXuat: DeXuatChuyenVai[];
}

export function TrangTaiKhoan() {
  const { taiLai: taiLaiPhien, dangXuat } = useXacThuc();
  const [dl, setDl] = useState<DuLieu | null>(null);
  const [loi, setLoi] = useState<string | null>(null);

  const tai = useCallback(async () => {
    try {
      const [toi, dieuKien, lichSu] = await Promise.all([
        api.get<HoSoCuaToi>("/ho-so/toi"),
        api.get<DieuKienKichHoat[]>("/ho-so/toi/dieu-kien-kich-hoat"),
        api.get<LichSuVai[]>("/ho-so/toi/lich-su-vai")
      ]);
      const laThucTap = toi.vai_chi_tiet.some(v => v.vai === "THUC_TAP" && v.trang_thai !== "KET_THUC");
      const deXuat = laThucTap ? await api.get<DeXuatChuyenVai[]>("/ho-so/toi/de-xuat-chuyen-vai") : [];
      setDl({ toi, dieuKien, lichSu, deXuat });
      setLoi(null);
    } catch (e) {
      setLoi(thongDiepLoi(e));
    }
  }, []);

  useEffect(() => {
    void tai();
  }, [tai]);

  /** Sau moi thay doi: tai lai trang + phien (AuthProvider giu vai cho menu) */
  const lamMoi = useCallback(async () => {
    await Promise.all([tai(), taiLaiPhien()]);
  }, [tai, taiLaiPhien]);

  if (loi && !dl) return <Loi tieuDe="Không tải được tài khoản" chiTiet={loi} thuLai={() => void tai()} />;
  if (!dl) return <DangTai chu="Đang tải tài khoản…" />;

  const { toi } = dl;
  return (
    <div className="flex flex-col gap-6">
      <TieuDeTrang
        kicker="Tài khoản"
        tieuDe={toi.ho_so.ho_ten}
        moTa="Hồ sơ gốc của bạn trên Thiên Khuê S — một hồ sơ, nhiều vai trò."
        hanhDong={
          <Nut kieu="vien" co="nho" onClick={() => void dangXuat()}>
            Đăng xuất
          </Nut>
        }
      />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="flex min-w-0 flex-col gap-6">
          <TheHoSo toi={toi} lamMoi={lamMoi} />
          <TheVaiDangDung />
          <TheQuyenSku toi={toi} />
        </div>
        <div className="flex min-w-0 flex-col gap-6">
          <TheVai toi={toi} />
          {dl.dieuKien.length > 0 && <TheKichHoat dieuKien={dl.dieuKien} lamMoi={lamMoi} />}
          <TheDangKyThemVai toi={toi} lamMoi={lamMoi} />
          {toi.vai_chi_tiet.some(v => v.vai === "THUC_TAP" && v.trang_thai !== "KET_THUC") && (
            <TheDeXuatChuyenVai toi={toi} deXuat={dl.deXuat} lamMoi={lamMoi} />
          )}
        </div>
      </div>
      <TheLichSu lichSu={dl.lichSu} />
    </div>
  );
}

// ---------------------------------------------------------------- ho so

function TheHoSo({ toi, lamMoi }: { toi: HoSoCuaToi; lamMoi: () => Promise<void> }) {
  const [dangSua, setDangSua] = useState(false);
  const [f, setF] = useState({ ho_ten: toi.ho_so.ho_ten, sdt: toi.ho_so.sdt ?? "", anh_dai_dien: toi.chi_tiet.anh_dai_dien ?? "" });
  const [dangGui, setDangGui] = useState(false);
  const [loi, setLoi] = useState<unknown>(null);
  const [xong, setXong] = useState(false);

  function moSua() {
    setF({ ho_ten: toi.ho_so.ho_ten, sdt: toi.ho_so.sdt ?? "", anh_dai_dien: toi.chi_tiet.anh_dai_dien ?? "" });
    setLoi(null);
    setXong(false);
    setDangSua(true);
  }

  async function luu(e: React.FormEvent) {
    e.preventDefault();
    setDangGui(true);
    setLoi(null);
    const body: CapNhatHoSoBody = { ho_ten: f.ho_ten.trim(), sdt: f.sdt.trim() || null, anh_dai_dien: f.anh_dai_dien.trim() || null };
    try {
      await api.patch<HoSoCuaToi>("/ho-so/toi", body);
      await lamMoi();
      setDangSua(false);
      setXong(true);
    } catch (err) {
      setLoi(err);
    } finally {
      setDangGui(false);
    }
  }

  return (
    <The>
      <div className="mb-5 flex items-center gap-4">
        {toi.chi_tiet.anh_dai_dien ? (
          <img src={toi.chi_tiet.anh_dai_dien} alt="" className="h-16 w-16 shrink-0 rounded-full border border-vien object-cover" />
        ) : (
          <span aria-hidden className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-chinh-nhat text-h2 text-chinh-dam">
            {chuCaiDau(toi.ho_so.ho_ten)}
          </span>
        )}
        <div className="flex min-w-0 flex-col gap-1">
          <strong className="truncate text-h2 text-chu">{toi.ho_so.ho_ten}</strong>
          <span className="truncate text-sm text-chu-phu">{toi.email ?? toi.ho_so.email ?? "—"}</span>
          <div className="flex flex-wrap gap-2 pt-1">
            <NhanKichHoat toi={toi} />
            {toi.ho_so.crm_user_id && <Nhan tong="chinh">Nhân sự Lyno</Nhan>}
          </div>
        </div>
      </div>

      {!dangSua ? (
        <>
          <dl className="m-0 grid grid-cols-[112px_minmax(0,1fr)] gap-x-3 gap-y-3 text-sm text-chu">
            <dt className="text-chu-phu">Điện thoại</dt>
            <dd className="m-0 flex flex-col gap-1">
              <span className="flex flex-wrap items-center gap-2">
                {toi.ho_so.sdt ?? "—"}
                {toi.ho_so.sdt && (toi.chi_tiet.sdt_xac_minh_luc ? <Nhan tong="thanh-cong">Đã xác minh</Nhan> : <Nhan tong="canh-bao">Chưa xác minh</Nhan>)}
              </span>
              {toi.ho_so.sdt && !toi.chi_tiet.sdt_xac_minh_luc && (
                <span className="text-xs text-chu-mo">
                  Liên hệ CSKH LYNO để được gọi xác nhận số. Sau khi xác minh, bạn xem được hạng thành viên, đơn hàng và ưu đãi theo số này.
                </span>
              )}
            </dd>
            <dt className="text-chu-phu">Kích hoạt lúc</dt>
            <dd className="m-0">{dinhDangNgayGio(toi.chi_tiet.kich_hoat_luc)}</dd>
            <dt className="text-chu-phu">Tham gia</dt>
            <dd className="m-0">{dinhDangNgay(toi.chi_tiet.created_at)}</dd>
          </dl>
          {xong && (
            <ThongBaoNoiDong kieu="thanh-cong" className="mt-4">
              Đã lưu hồ sơ.
            </ThongBaoNoiDong>
          )}
          <Nut kieu="vien" co="nho" className="mt-5" onClick={moSua}>
            Sửa hồ sơ
          </Nut>
        </>
      ) : (
        <form onSubmit={luu} className="flex flex-col gap-4" noValidate>
          <ONhap nhan="Họ và tên" batBuoc value={f.ho_ten} onChange={e => setF({ ...f, ho_ten: e.target.value })} autoComplete="name" />
          <ONhap
            nhan="Điện thoại"
            type="tel"
            value={f.sdt}
            onChange={e => setF({ ...f, sdt: e.target.value })}
            placeholder="09xx xxx xxx"
            autoComplete="tel"
            goiY={toi.chi_tiet.sdt_xac_minh_luc ? "Đổi sang số khác sẽ cần CSKH xác minh lại." : undefined}
          />
          <ONhap
            nhan="Ảnh đại diện (đường dẫn)"
            type="url"
            value={f.anh_dai_dien}
            onChange={e => setF({ ...f, anh_dai_dien: e.target.value })}
            placeholder="https://…"
            goiY="Email đăng nhập không đổi ở đây."
          />
          <LoiChiTiet loi={loi} />
          <div className="flex flex-wrap gap-3">
            <Nut type="submit" co="nho" dangXuLy={dangGui} disabled={f.ho_ten.trim().length < 2}>
              Lưu
            </Nut>
            <Nut kieu="trong" co="nho" onClick={() => setDangSua(false)}>
              Huỷ
            </Nut>
          </div>
        </form>
      )}
    </The>
  );
}

// ---------------------------------------------------------------- vai dang dung

function TheVaiDangDung() {
  const { vaiDangDung, chonVai, dsVai } = useVaiDangDung();
  return (
    <The>
      <TheTieuDe
        kicker="Đang dùng"
        tieuDe="Vai trò làm việc"
        moTa={dsVai.length > 1 ? "Bạn có nhiều vai trò — chọn vai đang dùng để vào đúng không gian làm việc." : undefined}
      />
      {dsVai.length === 0 ? (
        <p className="m-0 text-sm text-chu-phu">Chưa có vai trò nào đang hoạt động. Hoàn thành khoá học để kích hoạt.</p>
      ) : (
        <div className="flex flex-col gap-4">
          <div className={lopThanhTab} role="radiogroup" aria-label="Vai trò đang dùng">
            {dsVai.map(v => {
              const chon = v === vaiDangDung;
              return (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={chon}
                  onClick={() => chonVai(v)}
                  className={lopTab(chon)}
                >
                  {NHAN_VAI[v]}
                </button>
              );
            })}
          </div>
          {vaiDangDung && (
            <NutLienKet href={TRANG_CUA_VAI[vaiDangDung]} co="nho" className="self-start">
              Vào không gian {NHAN_VAI[vaiDangDung]}
            </NutLienKet>
          )}
        </div>
      )}
    </The>
  );
}

// ---------------------------------------------------------------- cac vai

function TheVai({ toi }: { toi: HoSoCuaToi }) {
  return (
    <The>
      <TheTieuDe kicker="Vai trò" tieuDe="Các vai trò của bạn" moTa="Vai Sale, CSKH, CTV, thực tập, KOL, KOC chỉ hoạt động khi học và đạt bài kiểm tra (≥ 90%)." />
      {toi.vai_chi_tiet.length === 0 ? (
        <p className="m-0 text-sm text-chu-mo">Chưa có vai trò.</p>
      ) : (
        <ul className="m-0 flex list-none flex-col p-0">
          {toi.vai_chi_tiet.map(v => (
            <li key={v.vai} className="flex flex-wrap items-center justify-between gap-3 border-t border-vien py-3 first:border-t-0 first:pt-0">
              <div className="flex flex-col gap-1">
                <span className="text-h4 text-chu">{NHAN_VAI[v.vai]}</span>
                <span className="text-xs text-chu-mo">
                  Từ {dinhDangNgay(v.tu_luc)}
                  {v.den_luc ? ` đến ${dinhDangNgay(v.den_luc)}` : ""}
                </span>
              </div>
              <NhanTrangThai tt={v.trang_thai} />
            </li>
          ))}
        </ul>
      )}
    </The>
  );
}

// ---------------------------------------------------------------- kich hoat

function TheKichHoat({ dieuKien, lamMoi }: { dieuKien: DieuKienKichHoat[]; lamMoi: () => Promise<void> }) {
  const [dangGui, setDangGui] = useState<Vai | null>(null);
  const [loi, setLoi] = useState<unknown>(null);
  const [xong, setXong] = useState<string | null>(null);

  async function kichHoat(vai: Vai) {
    setDangGui(vai);
    setLoi(null);
    setXong(null);
    try {
      await api.post<DieuKienKichHoat>("/ho-so/toi/kich-hoat", { vai });
      setXong(`Vai trò ${NHAN_VAI[vai]} đã được kích hoạt.`);
      await lamMoi();
    } catch (e) {
      setLoi(e);
    } finally {
      setDangGui(null);
    }
  }

  return (
    <The>
      <TheTieuDe kicker="Học trước khi bán" tieuDe="Điều kiện kích hoạt" moTa="Hoàn thành bài học, bài kiểm tra bắt buộc đạt ≥ 90% và bài thực hành được duyệt." />
      <div className="flex flex-col gap-5">
        {dieuKien.map(dk => (
          <div key={dk.vai} className="rounded-lg bg-be-mat-phu p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <strong className="text-h3 text-chu">{NHAN_VAI[dk.vai]}</strong>
              <NhanTrangThai tt={dk.trang_thai} />
            </div>
            {dk.dieu_kien.length === 0 ? (
              <p className="m-0 text-sm text-chu-phu">{dk.con_thieu[0] ?? "Chưa có khoá học bắt buộc."}</p>
            ) : (
              <ul className="m-0 flex list-none flex-col gap-2 p-0 text-sm">
                {dk.dieu_kien.map((d, i) => (
                  <li key={`${d.khoa_hoc_id}-${d.loai}-${i}`} className="flex items-start gap-2">
                    <span
                      aria-hidden
                      className={cn(
                        "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-xs font-bold leading-none",
                        d.dat ? "bg-thanh-cong text-tren-chinh" : "border border-vien-dam bg-be-mat text-transparent"
                      )}
                    >
                      ✓
                    </span>
                    <span className={cn(d.dat ? "text-chu" : "text-chu-phu")}>
                      <span className="font-semibold">{d.khoa_hoc_ten}</span> — {d.mo_ta}
                      <span className="sr-only">{d.dat ? " (đạt)" : " (chưa đạt)"}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {dk.trang_thai === "DANG_HOC" && (
              <div className="mt-4 flex flex-wrap gap-3">
                {dk.dat ? (
                  <Nut co="nho" dangXuLy={dangGui === dk.vai} onClick={() => void kichHoat(dk.vai)}>
                    Kích hoạt vai {NHAN_VAI[dk.vai]}
                  </Nut>
                ) : (
                  <NutLienKet href="/hoc-vien" kieu="vien" co="nho">
                    Vào học tiếp
                  </NutLienKet>
                )}
              </div>
            )}
          </div>
        ))}
        {xong && <ThongBaoNoiDong kieu="thanh-cong">{xong}</ThongBaoNoiDong>}
        <LoiChiTiet loi={loi} />
      </div>
    </The>
  );
}

// ---------------------------------------------------------------- quyen SKU

function TheQuyenSku({ toi }: { toi: HoSoCuaToi }) {
  const q = toi.quyen_sku;
  const tong: Record<string, TongNhan> = { HOAT_DONG: "thanh-cong", CAN_HOC_LAI: "canh-bao", THU_HOI: "trung-tinh" };
  return (
    <The>
      <TheTieuDe kicker="Quyền theo sản phẩm" tieuDe="Mã được phép bán" moTa="Học và đạt khoá sản phẩm của mã nào mới được tư vấn, lấy mã giới thiệu, nhận chiến dịch của mã đó." />
      <div className="mb-4 grid grid-cols-3 gap-3 text-center">
        <div className="rounded-lg bg-thanh-cong-nhat px-2 py-3 text-thanh-cong">
          <div className="so text-h1">{q.hoat_dong}</div>
          <div className="text-xs font-medium">Được bán</div>
        </div>
        <div className={cn("rounded-lg px-2 py-3", q.can_hoc_lai ? "bg-canh-bao-nhat text-canh-bao" : "bg-be-mat-phu text-chu-phu")}>
          <div className="so text-h1">{q.can_hoc_lai}</div>
          <div className="text-xs font-medium">Cần học lại</div>
        </div>
        <div className="rounded-lg bg-be-mat-phu px-2 py-3 text-chu-phu">
          <div className="so text-h1">{q.thu_hoi}</div>
          <div className="text-xs font-medium">Thu hồi</div>
        </div>
      </div>
      {q.ds.length === 0 ? (
        <p className="m-0 text-sm text-chu-phu">Chưa có mã nào. Học khoá sản phẩm trong Học viện để được cấp quyền.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {q.ds.map(s => (
            <Nhan key={s.mau_id} tong={tong[s.trang_thai] ?? "trung-tinh"}>
              {s.ma_mau}
            </Nhan>
          ))}
        </div>
      )}
    </The>
  );
}

// ---------------------------------------------------------------- dang ky them vai

function TheDangKyThemVai({ toi, lamMoi }: { toi: HoSoCuaToi; lamMoi: () => Promise<void> }) {
  const conDuoc = VAI_TU_DANG_KY.filter(v => {
    const hc = toi.vai_chi_tiet.find(x => x.vai === v);
    return !hc || hc.trang_thai === "KET_THUC";
  });
  const [vai, setVai] = useState<string>("");
  const [ghiChu, setGhiChu] = useState("");
  const [dangGui, setDangGui] = useState(false);
  const [loi, setLoi] = useState<unknown>(null);
  const [xong, setXong] = useState<string | null>(null);

  if (!conDuoc.length) return null;

  async function gui(e: React.FormEvent) {
    e.preventDefault();
    if (!vai) return;
    setDangGui(true);
    setLoi(null);
    setXong(null);
    const body: DangKyThemVaiBody = { vai: vai as DangKyThemVaiBody["vai"], ghi_chu: ghiChu.trim() || undefined };
    try {
      await api.post<HoSoCuaToi>("/ho-so/toi/dang-ky-vai", body);
      setXong(`Đã đăng ký vai ${NHAN_VAI[body.vai]} — vào Học viện để bắt đầu học.`);
      setVai("");
      setGhiChu("");
      await lamMoi();
    } catch (err) {
      setLoi(err);
    } finally {
      setDangGui(false);
    }
  }

  return (
    <The>
      <TheTieuDe kicker="Mở rộng" tieuDe="Đăng ký thêm vai trò" moTa="Vai mới bắt đầu ở trạng thái đang học, kích hoạt khi bạn học và đạt bài kiểm tra." />
      <form onSubmit={gui} className="flex flex-col gap-4">
        <OChon
          nhan="Vai trò"
          batBuoc
          goiYChon="Chọn vai trò"
          luaChon={conDuoc.map(v => ({ giaTri: v, nhan: NHAN_VAI[v] }))}
          value={vai}
          onChange={e => setVai(e.target.value)}
        />
        <OVanBan nhan="Kinh nghiệm hoặc kênh của bạn" rows={3} value={ghiChu} onChange={e => setGhiChu(e.target.value)} maxLength={2000} />
        {xong && <ThongBaoNoiDong kieu="thanh-cong">{xong}</ThongBaoNoiDong>}
        <LoiChiTiet loi={loi} />
        <Nut type="submit" co="nho" className="self-start" dangXuLy={dangGui} disabled={!vai}>
          Đăng ký vai trò
        </Nut>
      </form>
    </The>
  );
}

// ---------------------------------------------------------------- kich hoat lam viec

/** "Kích hoạt làm việc" chi ap cho vai phai hoc (Sale, CSKH, CTV, TTS, KOL, KOC); vai khac -> khong hien nhan */
function NhanKichHoat({ toi }: { toi: HoSoCuaToi }) {
  const tt = trangThaiKichHoatLamViec(toi.vai_chi_tiet, toi.ho_so.kich_hoat_lam_viec);
  if (tt === "KHONG_AP_DUNG") return null;
  return tt === "DA_KICH_HOAT" ? <Nhan tong="thanh-cong">Đã kích hoạt làm việc</Nhan> : <Nhan tong="canh-bao">Chưa kích hoạt (cần học đạt)</Nhan>;
}

// ---------------------------------------------------------------- de xuat chuyen vai (thuc tap sinh)

const NHAN_TRANG_THAI_DE_XUAT: Record<DeXuatChuyenVai["trang_thai"], [string, TongNhan]> = {
  CHO_KIEM: ["Chờ kiểm", "canh-bao"],
  CHO_DUYET: ["Chờ duyệt", "chinh"],
  DA_DUYET: ["Đã duyệt", "thanh-cong"],
  TU_CHOI: ["Từ chối", "loi"],
  HUY: ["Huỷ", "trung-tinh"]
};

function TheDeXuatChuyenVai({ toi, deXuat, lamMoi }: { toi: HoSoCuaToi; deXuat: DeXuatChuyenVai[]; lamMoi: () => Promise<void> }) {
  const dangMo = deXuat.some(d => d.trang_thai === "CHO_KIEM" || d.trang_thai === "CHO_DUYET");
  const luaChon = VAI_CHUYEN_TU_THUC_TAP.filter(v => {
    const hc = toi.vai_chi_tiet.find(x => x.vai === v);
    return !hc || hc.trang_thai === "KET_THUC";
  });
  const [vai, setVai] = useState("");
  const [lyDo, setLyDo] = useState("");
  const [dangGui, setDangGui] = useState(false);
  const [loi, setLoi] = useState<unknown>(null);

  async function gui(e: React.FormEvent) {
    e.preventDefault();
    setDangGui(true);
    setLoi(null);
    const body: DeXuatChuyenVaiBody = { vai_moi: vai as DeXuatChuyenVaiBody["vai_moi"], ly_do: lyDo.trim() };
    try {
      await api.post<DeXuatChuyenVai>("/ho-so/toi/de-xuat-chuyen-vai", body);
      setVai("");
      setLyDo("");
      await lamMoi();
    } catch (err) {
      setLoi(err);
    } finally {
      setDangGui(false);
    }
  }

  return (
    <The>
      <TheTieuDe
        kicker="Thực tập sinh"
        tieuDe="Đề xuất chuyển vai"
        moTa="Đề xuất sang KOL / KOC được một người có thẩm quyền khác duyệt (bạn không tự duyệt). Được duyệt thì vai thực tập kết thúc và vai mới bắt đầu học. Học đạt khoá CTV thì hệ thống tự thêm vai CTV. Sale / CSKH là nhân sự, tuyển qua CRM."
      />
      {deXuat.length > 0 && (
        <ul className="mb-5 mt-0 flex list-none flex-col gap-2 p-0">
          {deXuat.map(d => {
            const [nhan, tong] = NHAN_TRANG_THAI_DE_XUAT[d.trang_thai];
            return (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-vien px-4 py-3 text-sm text-chu-phu">
                <span>
                  Sang <strong className="text-chu">{NHAN_VAI[d.du_lieu.vai_moi]}</strong> · {dinhDangNgay(d.created_at)}
                </span>
                <Nhan tong={tong}>{nhan}</Nhan>
              </li>
            );
          })}
        </ul>
      )}
      {dangMo ? (
        <ThongBaoNoiDong>Bạn đang có một đề xuất chờ xử lý.</ThongBaoNoiDong>
      ) : luaChon.length === 0 ? null : (
        <form onSubmit={gui} className="flex flex-col gap-4">
          <OChon
            nhan="Chuyển sang"
            batBuoc
            goiYChon="Chọn vai trò"
            luaChon={luaChon.map(v => ({ giaTri: v, nhan: NHAN_VAI[v] }))}
            value={vai}
            onChange={e => setVai(e.target.value)}
          />
          <OVanBan nhan="Lý do / kết quả thực tập" batBuoc rows={3} value={lyDo} onChange={e => setLyDo(e.target.value)} maxLength={1000} />
          <LoiChiTiet loi={loi} />
          <Nut type="submit" co="nho" className="self-start" dangXuLy={dangGui} disabled={!vai || lyDo.trim().length < 3}>
            Gửi đề xuất
          </Nut>
        </form>
      )}
    </The>
  );
}

// ---------------------------------------------------------------- lich su

function TheLichSu({ lichSu }: { lichSu: LichSuVai[] }) {
  return (
    <section>
      <TheTieuDe kicker="Lịch sử" tieuDe="Lịch sử chuyển vai" moTa="Ghi lại mọi lần cấp, kích hoạt, tạm dừng, kết thúc vai — không sửa, không xoá." />
      <Bang<LichSuVai>
        khoaDong={r => r.id}
        dong={lichSu}
        cot={[
          { khoa: "created_at", tieuDe: "Thời điểm", hienThi: r => dinhDangNgayGio(r.created_at) },
          { khoa: "vai", tieuDe: "Vai trò", hienThi: r => NHAN_VAI[r.vai] },
          {
            khoa: "trang_thai",
            tieuDe: "Thay đổi",
            hienThi: r => (
              <span className="inline-flex flex-wrap items-center gap-2">
                <NhanTrangThai tt={r.trang_thai_cu} />
                <span aria-hidden>→</span>
                <NhanTrangThai tt={r.trang_thai_moi} />
              </span>
            )
          },
          { khoa: "nguoi_doi", tieuDe: "Người thực hiện", hienThi: r => r.nguoi_doi_ten ?? (r.nguoi_doi_id ? "—" : "Hệ thống") },
          { khoa: "ly_do", tieuDe: "Lý do", hienThi: r => <span className="text-chu-phu">{r.ly_do ?? "—"}</span> }
        ]}
      />
    </section>
  );
}
