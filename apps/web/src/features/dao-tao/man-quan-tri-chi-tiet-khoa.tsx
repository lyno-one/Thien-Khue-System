"use client";

import type { BaiHocQuanTri, BaiKiemTraQuanTri, CauHoiQuanTri, LoaiNoiDungBaiHoc, YeuCauHocLai } from "@thien-khue/contracts";
import { NHAN_LOAI_KHOA_HOC, NHAN_VAI } from "@thien-khue/contracts";
import Link from "next/link";
import { useState } from "react";
import { Bang, DangTai, HopThoai, Loi, Nhan, Nut, OChon, ONhap, OVanBan, The, ThongBaoNoiDong, TieuDeTrang, Trong } from "@/components/ui";
import { useTaiDuLieu } from "@/features/quan-tri/dung-chung";
import { thongDiepLoi } from "@/lib/api";
import { HopThoaiKhoa } from "./man-quan-tri-khoa";
import { quanTriNoiDungApi } from "./quan-tri-noi-dung-api";

/*
 * Soan noi dung mot khoa (QUAN_LY): bai hoc (markdown / video), bai kiem tra (nguong >= 90), cau hoi + dap an.
 * Xoa khoa / bai / de = tat (bat=false). Xoa cau hoi = xoa that. Server kiem luat noi cong hoc (403 kem huong dan).
 */

/** Hop thoai chung: form + loi + nut Huy / Luu. `luu` nem loi -> hien trong hop, thanh cong -> goi xong() */
function HopThoaiForm({
  tieuDe,
  rong = "vua",
  dong,
  luu,
  xong,
  nhanLuu = "Lưu",
  children
}: {
  tieuDe: string;
  rong?: "nho" | "vua" | "lon";
  dong: () => void;
  luu: () => Promise<void>;
  xong: () => void;
  nhanLuu?: string;
  children: React.ReactNode;
}) {
  const [dangLuu, setDangLuu] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);
  return (
    <HopThoai
      mo
      dong={dong}
      rong={rong}
      tieuDe={tieuDe}
      chanTrang={
        <>
          <Nut kieu="vien" type="button" onClick={dong}>
            Hủy
          </Nut>
          <Nut type="submit" form="form-hop" dangXuLy={dangLuu} disabled={dangLuu}>
            {nhanLuu}
          </Nut>
        </>
      }
    >
      <form
        id="form-hop"
        className="flex flex-col gap-4"
        onSubmit={async e => {
          e.preventDefault();
          setDangLuu(true);
          setLoi(null);
          try {
            await luu();
            xong();
          } catch (er) {
            setLoi(thongDiepLoi(er));
          } finally {
            setDangLuu(false);
          }
        }}
      >
        {loi && <ThongBaoNoiDong kieu="loi">{loi}</ThongBaoNoiDong>}
        {children}
      </form>
    </HopThoai>
  );
}

const soHoacUndef = (s: string) => (s.trim() === "" ? undefined : Number(s));
const soHoacNull = (s: string) => (s.trim() === "" ? null : Number(s));

// ------------------------------------------------------------------ bai hoc

function HopThoaiBai({ khoaId, bai, dong, xong }: { khoaId: string; bai: BaiHocQuanTri | null; dong: () => void; xong: () => void }) {
  const [ma, setMa] = useState(bai?.ma ?? "");
  const [tieuDe, setTieuDe] = useState(bai?.tieu_de ?? "");
  const [chuong, setChuong] = useState(bai?.chuong ?? "");
  const [loai, setLoai] = useState<LoaiNoiDungBaiHoc>(bai?.loai_noi_dung ?? "MARKDOWN");
  const [noiDung, setNoiDung] = useState(bai?.noi_dung ?? "");
  const [video, setVideo] = useState(bai?.video_url ?? "");
  const [tomTat, setTomTat] = useState(bai?.tom_tat ?? "");
  const [phut, setPhut] = useState(bai?.thoi_luong_phut != null ? String(bai.thoi_luong_phut) : "");
  const [thuTu, setThuTu] = useState(String(bai?.thu_tu ?? 0));

  return (
    <HopThoaiForm
      tieuDe={bai ? `Sửa bài: ${bai.tieu_de}` : "Thêm bài học"}
      rong="lon"
      dong={dong}
      xong={xong}
      luu={async () => {
        const body = {
          ma: ma.trim(),
          tieu_de: tieuDe.trim(),
          chuong: chuong.trim() || undefined,
          loai_noi_dung: loai,
          noi_dung: noiDung || undefined,
          video_url: loai === "VIDEO" ? video.trim() || undefined : undefined,
          tom_tat: tomTat.trim() || undefined,
          thoi_luong_phut: soHoacUndef(phut),
          thu_tu: Number(thuTu) || 0
        };
        if (bai) await quanTriNoiDungApi.suaBai(bai.id, body);
        else await quanTriNoiDungApi.taoBai(khoaId, body);
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <ONhap nhan="Tiêu đề" batBuoc value={tieuDe} onChange={e => setTieuDe(e.target.value)} maxLength={300} />
        <ONhap nhan="Mã bài" batBuoc value={ma} onChange={e => setMa(e.target.value)} maxLength={80} goiY="Chữ không dấu, số, gạch nối" />
        <ONhap nhan="Chương / nhóm" value={chuong} onChange={e => setChuong(e.target.value)} maxLength={200} />
        <OChon
          nhan="Dạng nội dung"
          value={loai}
          onChange={e => setLoai(e.target.value as LoaiNoiDungBaiHoc)}
          luaChon={[
            { giaTri: "MARKDOWN", nhan: "Văn bản (Markdown)" },
            { giaTri: "VIDEO", nhan: "Video" }
          ]}
        />
      </div>
      {loai === "VIDEO" && <ONhap nhan="Link video" type="url" value={video} onChange={e => setVideo(e.target.value)} goiY="https://…" />}
      <OVanBan nhan={loai === "VIDEO" ? "Ghi chú kèm video (Markdown)" : "Nội dung (Markdown)"} rows={10} value={noiDung} onChange={e => setNoiDung(e.target.value)} />
      <OVanBan nhan="Tóm tắt" rows={2} value={tomTat} onChange={e => setTomTat(e.target.value)} maxLength={2000} />
      <div className="grid gap-4 sm:grid-cols-2">
        <ONhap nhan="Thời lượng (phút)" type="number" min={0} max={600} value={phut} onChange={e => setPhut(e.target.value)} />
        <ONhap nhan="Thứ tự" type="number" min={0} value={thuTu} onChange={e => setThuTu(e.target.value)} />
      </div>
    </HopThoaiForm>
  );
}

// ------------------------------------------------------------------ bai kiem tra

function HopThoaiDe({ khoaId, de, dong, xong }: { khoaId: string; de: BaiKiemTraQuanTri | null; dong: () => void; xong: () => void }) {
  const [ma, setMa] = useState(de?.ma ?? "");
  const [tieuDe, setTieuDe] = useState(de?.tieu_de ?? "");
  const [nguong, setNguong] = useState(String(de?.nguong_dat ?? 90));
  const [batBuoc, setBatBuoc] = useState(de?.bat_buoc ?? true);
  const [soCau, setSoCau] = useState(de?.so_cau_hien != null ? String(de.so_cau_hien) : "");
  const [phut, setPhut] = useState(de?.thoi_gian_phut != null ? String(de.thoi_gian_phut) : "");
  const [soLan, setSoLan] = useState(de?.so_lan_toi_da != null ? String(de.so_lan_toi_da) : "");

  return (
    <HopThoaiForm
      tieuDe={de ? `Sửa bài kiểm tra: ${de.tieu_de}` : "Thêm bài kiểm tra"}
      dong={dong}
      xong={xong}
      luu={async () => {
        const body = {
          ma: ma.trim(),
          tieu_de: tieuDe.trim(),
          nguong_dat: Number(nguong),
          bat_buoc: batBuoc,
          so_cau_hien: soHoacNull(soCau),
          thoi_gian_phut: soHoacNull(phut),
          so_lan_toi_da: soHoacNull(soLan)
        };
        if (de) await quanTriNoiDungApi.suaDe(de.id, body);
        else await quanTriNoiDungApi.taoDe(khoaId, body);
      }}
    >
      <ONhap nhan="Tiêu đề" batBuoc value={tieuDe} onChange={e => setTieuDe(e.target.value)} maxLength={300} />
      <div className="grid gap-4 sm:grid-cols-2">
        <ONhap nhan="Mã bài kiểm tra" batBuoc value={ma} onChange={e => setMa(e.target.value)} maxLength={80} goiY="Chữ không dấu, số, gạch nối" />
        <ONhap nhan="Ngưỡng đạt (%)" type="number" min={90} max={100} batBuoc value={nguong} onChange={e => setNguong(e.target.value)} goiY="Tối thiểu 90%" />
        <ONhap nhan="Số câu mỗi lượt" type="number" min={1} value={soCau} onChange={e => setSoCau(e.target.value)} goiY="Để trống = làm hết ngân hàng câu hỏi" />
        <ONhap nhan="Thời gian (phút)" type="number" min={1} max={600} value={phut} onChange={e => setPhut(e.target.value)} goiY="Để trống = không giới hạn" />
        <ONhap nhan="Số lần làm tối đa" type="number" min={1} value={soLan} onChange={e => setSoLan(e.target.value)} goiY="Để trống = không giới hạn" />
      </div>
      <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-chu">
        <input type="checkbox" checked={batBuoc} onChange={e => setBatBuoc(e.target.checked)} />
        Bắt buộc đạt để hoàn thành khóa
      </label>
    </HopThoaiForm>
  );
}

// ------------------------------------------------------------------ cau hoi

function HopThoaiCau({ deId, cau, dong, xong }: { deId: string; cau: CauHoiQuanTri | null; dong: () => void; xong: () => void }) {
  const [ma, setMa] = useState(cau?.ma ?? "");
  const [noiDung, setNoiDung] = useState(cau?.noi_dung ?? "");
  const [luaChon, setLuaChon] = useState<string[]>(cau?.lua_chon ?? ["", "", "", ""]);
  const [dapAn, setDapAn] = useState<number[]>(cau?.dap_an ?? []);
  const [giaiThich, setGiaiThich] = useState(cau?.giai_thich ?? "");
  const [diem, setDiem] = useState(String(cau?.diem ?? 1));

  const xoaLuaChon = (i: number) => {
    setLuaChon(l => l.filter((_, k) => k !== i));
    // dap an sau o bi xoa lui 1 vi tri
    setDapAn(d => d.filter(x => x !== i).map(x => (x > i ? x - 1 : x)));
  };

  return (
    <HopThoaiForm
      tieuDe={cau ? "Sửa câu hỏi" : "Thêm câu hỏi"}
      rong="lon"
      dong={dong}
      xong={xong}
      luu={async () => {
        const co = luaChon.map(l => l.trim());
        if (co.some(l => !l)) throw new Error("Các lựa chọn không được để trống (xóa dòng thừa)");
        if (co.length < 2) throw new Error("Cần ít nhất 2 lựa chọn");
        if (!dapAn.length) throw new Error("Tick ít nhất một đáp án đúng");
        const body = {
          ma: ma.trim(),
          noi_dung: noiDung.trim(),
          lua_chon: co,
          dap_an: [...dapAn].sort((a, b) => a - b),
          giai_thich: giaiThich.trim() || undefined,
          diem: Number(diem) || 1
        };
        if (cau) await quanTriNoiDungApi.suaCau(cau.id, body);
        else await quanTriNoiDungApi.taoCau(deId, body);
      }}
    >
      <OVanBan nhan="Câu hỏi" batBuoc rows={3} value={noiDung} onChange={e => setNoiDung(e.target.value)} maxLength={2000} />
      <div className="grid gap-4 sm:grid-cols-2">
        <ONhap nhan="Mã câu" batBuoc value={ma} onChange={e => setMa(e.target.value)} maxLength={80} goiY="Chữ không dấu, số, gạch nối (vd cau-01)" />
        <ONhap nhan="Điểm" type="number" min={1} max={100} value={diem} onChange={e => setDiem(e.target.value)} />
      </div>
      <fieldset className="flex flex-col gap-2 border-0 p-0">
        <legend className="mb-1 text-sm font-medium text-chu">Các lựa chọn — tick ô đáp án đúng (chọn nhiều nếu câu nhiều đáp án)</legend>
        {luaChon.map((l, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="checkbox"
              aria-label={`Lựa chọn ${i + 1} là đáp án đúng`}
              checked={dapAn.includes(i)}
              onChange={e => setDapAn(d => (e.target.checked ? [...d, i] : d.filter(x => x !== i)))}
            />
            <ONhap aria-label={`Lựa chọn ${i + 1}`} lopKhung="flex-1" value={l} maxLength={500} onChange={e => setLuaChon(c => c.map((x, k) => (k === i ? e.target.value : x)))} />
            <Nut type="button" kieu="trong" co="nho" disabled={luaChon.length <= 2} onClick={() => xoaLuaChon(i)} aria-label={`Xóa lựa chọn ${i + 1}`}>
              Xóa
            </Nut>
          </div>
        ))}
        <div>
          <Nut type="button" kieu="vien" co="nho" disabled={luaChon.length >= 10} onClick={() => setLuaChon(c => [...c, ""])}>
            Thêm lựa chọn
          </Nut>
        </div>
      </fieldset>
      <OVanBan nhan="Giải thích (hiện sau khi nộp bài)" rows={2} value={giaiThich} onChange={e => setGiaiThich(e.target.value)} maxLength={5000} />
    </HopThoaiForm>
  );
}

// ------------------------------------------------------------------ tang phien ban

function HopThoaiPhienBan({ khoaId, dong, xong }: { khoaId: string; dong: () => void; xong: (msg: string) => void }) {
  const [lyDo, setLyDo] = useState("");
  const [yeuCau, setYeuCau] = useState<YeuCauHocLai>("XAC_NHAN");
  const [kq, setKq] = useState<string>("");
  return (
    <HopThoaiForm
      tieuDe="Tăng phiên bản tài liệu"
      dong={dong}
      nhanLuu="Tăng phiên bản"
      xong={() => xong(kq)}
      luu={async () => {
        const r = await quanTriNoiDungApi.tangPhienBan(khoaId, { ly_do: lyDo.trim(), yeu_cau: yeuCau });
        setKq(`Đã lên phiên bản ${r.phien_ban_tai_lieu}; ${r.so_quyen_can_hoc_lai} quyền SKU chuyển sang “Cần học lại”.`);
      }}
    >
      <p className="m-0 text-sm text-chu-phu">Dùng khi sản phẩm đổi thông tin quan trọng: quyền bán SKU của mọi người đã học chuyển sang “Cần học lại” và họ nhận thông báo.</p>
      <OVanBan nhan="Lý do" batBuoc rows={3} minLength={3} value={lyDo} onChange={e => setLyDo(e.target.value)} maxLength={1000} />
      <OChon
        nhan="Yêu cầu với người đã học"
        value={yeuCau}
        onChange={e => setYeuCau(e.target.value as YeuCauHocLai)}
        luaChon={[
          { giaTri: "XAC_NHAN", nhan: "Chỉ cần xác nhận đã đọc thay đổi" },
          { giaTri: "THI_LAI", nhan: "Phải thi lại" }
        ]}
      />
    </HopThoaiForm>
  );
}

// ------------------------------------------------------------------ man hinh

type Dang =
  | { loai: "khoa" }
  | { loai: "bai"; bai: BaiHocQuanTri | null }
  | { loai: "de"; de: BaiKiemTraQuanTri | null }
  | { loai: "cau"; deId: string; cau: CauHoiQuanTri | null }
  | { loai: "phien-ban" };

export function ManQuanTriChiTietKhoa({ id }: { id: string }) {
  const d = useTaiDuLieu(() => quanTriNoiDungApi.chiTietKhoa(id), [id]);
  const [dang, setDang] = useState<{ viec: Dang; lan: number } | null>(null);
  const [thongBao, setThongBao] = useState<string | null>(null);
  const [loiThaoTac, setLoiThaoTac] = useState<string | null>(null);
  const [deMo, setDeMo] = useState<string | null>(null);
  const mo = (viec: Dang) => setDang({ viec, lan: Date.now() });
  const dongHop = () => setDang(null);
  const xongHop = (msg?: string) => {
    setDang(null);
    if (msg) setThongBao(msg);
    void d.taiLai();
  };

  const thaoTac = async (viec: () => Promise<unknown>, msg: string) => {
    setLoiThaoTac(null);
    try {
      await viec();
      setThongBao(msg);
      void d.taiLai();
    } catch (e) {
      setLoiThaoTac(thongDiepLoi(e));
    }
  };

  if (d.loi) return <Loi chiTiet={d.loi} thuLai={() => void d.taiLai()} />;
  const k = d.duLieu;
  if (!k) return <DangTai />;

  return (
    <div className="flex flex-col gap-8 [&>header]:mb-0">
      <TieuDeTrang
        kicker={
          <Link href="/hoc-vien/quan-tri/khoa-hoc" className="hover:underline">
            ← Quản trị khóa học
          </Link>
        }
        tieuDe={k.ten}
        moTa={k.mo_ta ?? undefined}
        hanhDong={
          <div className="flex flex-wrap gap-2">
            {k.loai === "SAN_PHAM" && (
              <Nut kieu="vien" onClick={() => mo({ loai: "phien-ban" })}>
                Tăng phiên bản
              </Nut>
            )}
            <Nut kieu="vien" onClick={() => mo({ loai: "khoa" })}>
              Sửa thông tin khóa
            </Nut>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2 text-sm text-chu-phu">
        <Nhan tong={k.bat ? "thanh-cong" : "trung-tinh"}>{k.bat ? "Đang bật" : "Đã tắt"}</Nhan>
        <Nhan tong="chinh">{NHAN_LOAI_KHOA_HOC[k.loai]}</Nhan>
        {k.bat_buoc && <Nhan tong="canh-bao">Bắt buộc</Nhan>}
        {k.can_thuc_hanh && <Nhan tong="canh-bao">Có thực hành</Nhan>}
        <span>Mã: {k.ma}</span>
        <span>· Phiên bản tài liệu {k.phien_ban_tai_lieu}</span>
        <span>· {k.so_hoc_vien} học viên</span>
        <span>· Vai: {k.vai_ap_dung.map(v => NHAN_VAI[v]).join(", ")}</span>
      </div>

      {thongBao && <ThongBaoNoiDong kieu="thanh-cong">{thongBao}</ThongBaoNoiDong>}
      {loiThaoTac && <ThongBaoNoiDong kieu="loi">{loiThaoTac}</ThongBaoNoiDong>}

      <section aria-labelledby="tieu-de-bai" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="tieu-de-bai" className="m-0 text-h2 text-chu">
            Bài học ({k.bai_hoc.length})
          </h2>
          <Nut onClick={() => mo({ loai: "bai", bai: null })}>Thêm bài học</Nut>
        </div>
        <Bang
          dong={[...k.bai_hoc].sort((a, b) => a.thu_tu - b.thu_tu)}
          khoaDong={b => b.id}
          rong={<Trong tieuDe="Khóa chưa có bài học" moTa="Bấm “Thêm bài học” để soạn bài đầu tiên." />}
          cot={[
            { khoa: "thu_tu", tieuDe: "#", canPhai: true, hienThi: b => b.thu_tu },
            {
              khoa: "tieu_de",
              tieuDe: "Bài học",
              hienThi: b => (
                <div className="flex flex-col">
                  <span className="font-medium">{b.tieu_de}</span>
                  <span className="text-xs text-chu-mo">
                    {b.ma}
                    {b.chuong ? ` · ${b.chuong}` : ""}
                  </span>
                </div>
              )
            },
            { khoa: "loai", tieuDe: "Dạng", hienThi: b => (b.loai_noi_dung === "VIDEO" ? "Video" : "Văn bản") },
            { khoa: "phut", tieuDe: "Phút", canPhai: true, hienThi: b => b.thoi_luong_phut ?? "—" },
            { khoa: "tt", tieuDe: "Trạng thái", hienThi: b => <Nhan tong={b.bat ? "thanh-cong" : "trung-tinh"}>{b.bat ? "Đang bật" : "Đã tắt"}</Nhan> },
            {
              khoa: "tac",
              tieuDe: "",
              canPhai: true,
              hienThi: b => (
                <div className="flex justify-end gap-2">
                  <Nut kieu="vien" co="nho" onClick={() => mo({ loai: "bai", bai: b })}>
                    Sửa
                  </Nut>
                  <Nut
                    kieu={b.bat ? "vien-loi" : "vien"}
                    co="nho"
                    onClick={() =>
                      void thaoTac(() => (b.bat ? quanTriNoiDungApi.tatBai(b.id) : quanTriNoiDungApi.suaBai(b.id, { bat: true })), b.bat ? `Đã tắt bài "${b.tieu_de}"` : `Đã bật lại bài "${b.tieu_de}"`)
                    }
                  >
                    {b.bat ? "Tắt" : "Bật lại"}
                  </Nut>
                </div>
              )
            }
          ]}
        />
      </section>

      <section aria-labelledby="tieu-de-de" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="tieu-de-de" className="m-0 text-h2 text-chu">
            Bài kiểm tra ({k.bai_kiem_tra.length})
          </h2>
          <Nut onClick={() => mo({ loai: "de", de: null })}>Thêm bài kiểm tra</Nut>
        </div>
        {k.bai_kiem_tra.length === 0 && <Trong tieuDe="Khóa chưa có bài kiểm tra" moTa="Khóa không có đề bắt buộc đang bật sẽ không bao giờ tính là hoàn thành." />}
        {k.bai_kiem_tra.map(de => (
          <The key={de.id} className="flex flex-col gap-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex flex-col gap-1">
                <h3 className="m-0 text-h3 text-chu">{de.tieu_de}</h3>
                <p className="m-0 text-sm text-chu-phu">
                  {de.ma} · đạt từ {de.nguong_dat}% · {de.so_cau} câu
                  {de.so_cau_hien ? ` (mỗi lượt ${de.so_cau_hien})` : ""}
                  {de.thoi_gian_phut ? ` · ${de.thoi_gian_phut} phút` : ""}
                  {de.so_lan_toi_da ? ` · tối đa ${de.so_lan_toi_da} lần` : ""}
                </p>
                <div className="flex gap-2">
                  <Nhan tong={de.bat ? "thanh-cong" : "trung-tinh"}>{de.bat ? "Đang bật" : "Đã tắt"}</Nhan>
                  {de.bat_buoc && <Nhan tong="canh-bao">Bắt buộc</Nhan>}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Nut kieu="vien" co="nho" onClick={() => setDeMo(deMo === de.id ? null : de.id)} aria-expanded={deMo === de.id}>
                  {deMo === de.id ? "Ẩn câu hỏi" : "Xem câu hỏi"}
                </Nut>
                <Nut kieu="vien" co="nho" onClick={() => mo({ loai: "de", de })}>
                  Sửa đề
                </Nut>
                <Nut
                  kieu={de.bat ? "vien-loi" : "vien"}
                  co="nho"
                  onClick={() =>
                    void thaoTac(() => (de.bat ? quanTriNoiDungApi.tatDe(de.id) : quanTriNoiDungApi.suaDe(de.id, { bat: true })), de.bat ? `Đã tắt đề "${de.tieu_de}"` : `Đã bật lại đề "${de.tieu_de}"`)
                  }
                >
                  {de.bat ? "Tắt" : "Bật lại"}
                </Nut>
              </div>
            </div>

            {deMo === de.id && (
              <div className="flex flex-col gap-3 border-t border-vien pt-3">
                {(de.cau_hoi ?? []).length === 0 && <p className="m-0 text-sm text-chu-phu">Chưa có câu hỏi.</p>}
                {[...(de.cau_hoi ?? [])]
                  .sort((a, b) => a.thu_tu - b.thu_tu)
                  .map((c, i) => (
                    <div key={c.id} className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-vien p-3">
                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <p className="m-0 text-sm font-medium text-chu">
                          {i + 1}. {c.noi_dung}
                        </p>
                        <ul className="m-0 list-none p-0 text-sm text-chu-phu">
                          {c.lua_chon.map((l, k2) => (
                            <li key={k2} className={c.dap_an.includes(k2) ? "font-medium text-thanh-cong" : undefined}>
                              {c.dap_an.includes(k2) ? "✓" : "○"} {l}
                            </li>
                          ))}
                        </ul>
                        <span className="text-xs text-chu-mo">
                          {c.ma} · {c.diem} điểm
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <Nut kieu="vien" co="nho" onClick={() => mo({ loai: "cau", deId: de.id, cau: c })}>
                          Sửa
                        </Nut>
                        <Nut
                          kieu="vien-loi"
                          co="nho"
                          onClick={() => {
                            if (window.confirm("Xóa hẳn câu hỏi này? Không hoàn tác được.")) void thaoTac(() => quanTriNoiDungApi.xoaCau(c.id), "Đã xóa câu hỏi");
                          }}
                        >
                          Xóa
                        </Nut>
                      </div>
                    </div>
                  ))}
                <div>
                  <Nut kieu="nhat" co="nho" onClick={() => mo({ loai: "cau", deId: de.id, cau: null })}>
                    Thêm câu hỏi
                  </Nut>
                </div>
              </div>
            )}
          </The>
        ))}
      </section>

      {dang?.viec.loai === "khoa" && (
        <HopThoaiKhoa key={dang.lan} khoa={k} dong={dongHop} xong={x => xongHop(`Đã lưu khóa "${x.ten}"`)} />
      )}
      {dang?.viec.loai === "bai" && <HopThoaiBai key={dang.lan} khoaId={k.id} bai={dang.viec.bai} dong={dongHop} xong={() => xongHop("Đã lưu bài học")} />}
      {dang?.viec.loai === "de" && <HopThoaiDe key={dang.lan} khoaId={k.id} de={dang.viec.de} dong={dongHop} xong={() => xongHop("Đã lưu bài kiểm tra")} />}
      {dang?.viec.loai === "cau" && <HopThoaiCau key={dang.lan} deId={dang.viec.deId} cau={dang.viec.cau} dong={dongHop} xong={() => xongHop("Đã lưu câu hỏi")} />}
      {dang?.viec.loai === "phien-ban" && <HopThoaiPhienBan key={dang.lan} khoaId={k.id} dong={dongHop} xong={xongHop} />}
    </div>
  );
}
