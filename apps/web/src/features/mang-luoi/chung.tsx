"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  NHAN_TRANG_THAI_BAI_TAP_TTS,
  NHAN_TRANG_THAI_CHIEN_DICH,
  NHAN_TRANG_THAI_GHI_NHAN,
  NHAN_TRANG_THAI_HOA_HONG,
  NHAN_TRANG_THAI_NOI_DUNG,
  NHAN_TRANG_THAI_THAM_GIA,
  type TrangThaiBaiTapTts,
  type TrangThaiChienDichMl,
  type TrangThaiGhiNhanMl,
  type TrangThaiHoaHongMl,
  type TrangThaiNoiDungMl,
  type TrangThaiThamGiaMl,
  type Vai
} from "@thien-khue/contracts";
import { lopNutVien, Nhan, type TongNhan } from "@/components/ui";
import { thongDiepLoi } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useXacThuc } from "@/providers/auth-provider";

/** Tai du lieu + taiLai(); bo ket qua cu khi deps doi */
export function useTaiMl<T>(ham: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [loi, setLoi] = useState<string | null>(null);
  const [dangTai, setDangTai] = useState(true);
  const lan = useRef(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const goi = useCallback(ham, deps);
  const taiLai = useCallback(async () => {
    const lanNay = ++lan.current;
    setDangTai(true);
    try {
      const kq = await goi();
      if (lanNay === lan.current) {
        setData(kq);
        setLoi(null);
      }
    } catch (e) {
      if (lanNay === lan.current) setLoi(thongDiepLoi(e));
    } finally {
      if (lanNay === lan.current) setDangTai(false);
    }
  }, [goi]);
  useEffect(() => {
    void taiLai();
  }, [taiLai]);
  return { data, loi, dangTai, taiLai, setData };
}

/** Quyen hien thi theo vai (API van tu kiem) */
export function useVaiMangLuoi() {
  const { nguoiDung, coVai } = useXacThuc();
  const coVaiChiTiet = (vai: Vai) => !!nguoiDung?.vai_chi_tiet.some(v => v.vai === vai && v.trang_thai !== "KET_THUC");
  return {
    gioiThieu: coVai("CTV", "THUC_TAP", "KOL", "KOC"),
    taoNoiDung: coVai("KOL", "KOC", "CTV", "THUC_TAP"),
    thucTap: coVaiChiTiet("THUC_TAP"),
    mentor: coVai("MENTOR", "QUAN_LY"),
    quanLy: coVai("QUAN_LY"),
    chotDon: coVai("SALE", "CSKH", "QUAN_LY"),
    hoTro: coVai("KOL", "KOC"),
    coLienQuan:
      coVai("CTV", "THUC_TAP", "KOL", "KOC", "MENTOR", "QUAN_LY", "SALE", "CSKH") ||
      ["CTV", "THUC_TAP", "KOL", "KOC"].some(v => coVaiChiTiet(v as Vai))
  };
}

type KhoaTab = "tong-quan" | "ma" | "chien-dich" | "noi-dung" | "ho-tro" | "thu-nhap" | "thuc-tap" | "quan-ly";

const TAB: { khoa: KhoaTab; href: string; nhan: string; chinhXac?: boolean }[] = [
  { khoa: "tong-quan", href: "/lam-viec/mang-luoi", nhan: "Tổng quan", chinhXac: true },
  { khoa: "ma", href: "/lam-viec/mang-luoi/ma-gioi-thieu", nhan: "Mã giới thiệu" },
  { khoa: "chien-dich", href: "/lam-viec/mang-luoi/chien-dich", nhan: "Chiến dịch" },
  { khoa: "noi-dung", href: "/lam-viec/mang-luoi/noi-dung", nhan: "Nộp video" },
  { khoa: "ho-tro", href: "/lam-viec/mang-luoi/ho-tro", nhan: "Hỗ trợ" },
  { khoa: "thu-nhap", href: "/lam-viec/mang-luoi/thu-nhap", nhan: "Thu nhập" },
  { khoa: "thuc-tap", href: "/lam-viec/mang-luoi/thuc-tap", nhan: "Thực tập" },
  { khoa: "quan-ly", href: "/lam-viec/mang-luoi/quan-ly", nhan: "Quản lý" }
];

/** Thanh tab khu mang luoi — cuon ngang trong khung tren mobile */
export function ThanhTabMangLuoi() {
  const duongDan = usePathname();
  const q = useVaiMangLuoi();
  const hien: Record<KhoaTab, boolean> = {
    "tong-quan": true,
    ma: q.gioiThieu,
    "chien-dich": q.taoNoiDung,
    "noi-dung": q.taoNoiDung,
    "ho-tro": q.hoTro,
    "thu-nhap": true,
    "thuc-tap": q.thucTap || q.mentor,
    "quan-ly": q.quanLy
  };
  return (
    <nav aria-label="Khu mạng lưới" className="cuon-mong -mx-1 mb-6 overflow-x-auto border-b border-vien">
      <ul className="m-0 flex min-w-max list-none gap-1 px-1 pb-2">
        {TAB.filter(t => hien[t.khoa]).map(t => {
          const dangO = t.chinhXac ? duongDan === t.href : duongDan === t.href || duongDan.startsWith(`${t.href}/`);
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                aria-current={dangO ? "page" : undefined}
                className={cn(
                  "inline-flex h-9 items-center whitespace-nowrap rounded-lg px-3 text-sm no-underline transition-colors duration-nhanh",
                  dangO ? "bg-chinh-nhat font-semibold text-chinh-dam" : "font-medium text-chu-phu hover:bg-be-mat-phu hover:text-chu"
                )}
              >
                {t.nhan}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

// ------------------------------------------------------------------ nhan trang thai

const TONG_HOA_HONG: Record<TrangThaiHoaHongMl, TongNhan> = { CHO_DOI_SOAT: "trung-tinh", DU_DIEU_KIEN: "thanh-cong", DA_TRA: "chinh", BI_TRU: "loi" };
const TONG_GHI_NHAN: Record<TrangThaiGhiNhanMl, TongNhan> = { HOP_LE: "thanh-cong", CHO_XAC_MINH: "canh-bao", BI_HUY: "trung-tinh", DA_DOI_SOAT: "chinh" };
const TONG_NOI_DUNG: Record<TrangThaiNoiDungMl, TongNhan> = { NHAP: "trung-tinh", CHO_DUYET: "canh-bao", CAN_SUA: "canh-bao", DA_DUYET: "thanh-cong", TU_CHOI: "loi", DA_DANG: "chinh" };
const TONG_THAM_GIA: Record<TrangThaiThamGiaMl, TongNhan> = { CHO_DUYET: "canh-bao", DA_DUYET: "thanh-cong", TU_CHOI: "loi", HOAN_THANH: "chinh" };
const TONG_CHIEN_DICH: Record<TrangThaiChienDichMl, TongNhan> = { NHAP: "trung-tinh", DANG_CHAY: "thanh-cong", TAM_DUNG: "canh-bao", KET_THUC: "trung-tinh" };
const TONG_BAI_TAP: Record<TrangThaiBaiTapTts, TongNhan> = { CHO_CHAM: "canh-bao", DAT: "thanh-cong", CHUA_DAT: "loi" };

export const NhanHoaHong = ({ tt }: { tt: TrangThaiHoaHongMl }) => <Nhan tong={TONG_HOA_HONG[tt]}>{NHAN_TRANG_THAI_HOA_HONG[tt]}</Nhan>;
export const NhanGhiNhan = ({ tt }: { tt: TrangThaiGhiNhanMl }) => <Nhan tong={TONG_GHI_NHAN[tt]}>{NHAN_TRANG_THAI_GHI_NHAN[tt]}</Nhan>;
export const NhanNoiDung = ({ tt }: { tt: TrangThaiNoiDungMl }) => <Nhan tong={TONG_NOI_DUNG[tt]}>{NHAN_TRANG_THAI_NOI_DUNG[tt]}</Nhan>;
export const NhanThamGia = ({ tt }: { tt: TrangThaiThamGiaMl }) => <Nhan tong={TONG_THAM_GIA[tt]}>{NHAN_TRANG_THAI_THAM_GIA[tt]}</Nhan>;
export const NhanChienDich = ({ tt }: { tt: TrangThaiChienDichMl }) => <Nhan tong={TONG_CHIEN_DICH[tt]}>{NHAN_TRANG_THAI_CHIEN_DICH[tt]}</Nhan>;
export const NhanBaiTap = ({ tt }: { tt: TrangThaiBaiTapTts }) => <Nhan tong={TONG_BAI_TAP[tt]}>{NHAN_TRANG_THAI_BAI_TAP_TTS[tt]}</Nhan>;

/** Duong dan gioi thieu: trang cong khai doc ?mgt= (storefront ghi click + mang ma vao don) */
export function duongDanGioiThieu(ma: string, maMau: string | null): string {
  const goc = typeof window !== "undefined" ? window.location.origin : "";
  return maMau ? `${goc}/san-pham/${encodeURIComponent(maMau)}?mgt=${encodeURIComponent(ma)}` : `${goc}/?mgt=${encodeURIComponent(ma)}`;
}

/** Nut sao chep nho */
export function NutSaoChep({ giaTri, nhan = "Sao chép" }: { giaTri: string; nhan?: string }) {
  const [daChep, setDaChep] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(giaTri);
          setDaChep(true);
          setTimeout(() => setDaChep(false), 1500);
        } catch {
          setDaChep(false);
        }
      }}
      className={lopNutVien}
    >
      {daChep ? "Đã chép" : nhan}
    </button>
  );
}
