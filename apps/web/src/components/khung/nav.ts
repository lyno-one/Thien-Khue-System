import type { Vai } from "@thien-khue/contracts";

/** Trang con cua storefront (agent cong-khai dung page o cac duong dan nay) */
export const NAV_STOREFRONT = [
  { href: "/", nhan: "Trang chủ" },
  { href: "/vip", nhan: "Khách hàng VIP" },
  { href: "/than-thien", nhan: "Thân thiện" },
  { href: "/doi-tac", nhan: "Hạnh phúc CEO / Đối tác" },
  { href: "/dao-tao", nhan: "Đào tạo" }
];

export interface MucNav {
  href: string;
  nhan: string;
  /** Hien khi co mot trong cac vai HOAT_DONG (bo trong = moi nguoi da dang nhap) */
  vai?: Vai[];
  /** Khop chinh xac duong dan (khong tinh trang con) */
  chinhXac?: boolean;
  /** Hien ca khi vai dang DANG_HOC (vd thuc tap sinh vao muc Thuc tap truoc khi kich hoat) */
  kemDangHoc?: boolean;
}

export interface NhomNav {
  tieuDe: string;
  muc: MucNav[];
}

/**
 * MOT menu chung cho moi trang sau dang nhap (giong sidebar CRM): di sang khu nao menu van giu nguyen, chi sang muc dang o.
 * Muc nao hien do vai quyet (`vai`); nhom khong con muc nao thi an.
 */
export const NAV_APP: NhomNav[] = [
  {
    tieuDe: "Học viện",
    muc: [
      { href: "/hoc-vien", nhan: "Tổng quan học tập", chinhXac: true },
      { href: "/hoc-vien/khoa-hoc", nhan: "Khóa học" },
      { href: "/hoc-vien/bai-kiem-tra", nhan: "Bài kiểm tra" },
      { href: "/hoc-vien/chung-chi", nhan: "Chứng chỉ" },
      { href: "/hoc-vien/quyen-sku", nhan: "Quyền SKU" },
      { href: "/hoc-vien/cham-bai", nhan: "Chấm bài", vai: ["MENTOR", "QUAN_LY"] },
      { href: "/hoc-vien/quan-tri", nhan: "Điều hành học viện", vai: ["MENTOR", "QUAN_LY"] }
    ]
  },
  {
    tieuDe: "Làm việc",
    muc: [
      { href: "/lam-viec", nhan: "Tổng quan làm việc", chinhXac: true },
      { href: "/lam-viec/ban-hang", nhan: "Bán hàng", vai: ["SALE", "CSKH", "QUAN_LY"] },
      {
        href: "/lam-viec/mang-luoi",
        nhan: "Mạng lưới & hoa hồng",
        vai: ["CTV", "THUC_TAP", "KOL", "KOC", "MENTOR", "SALE", "CSKH", "QUAN_LY"],
        kemDangHoc: true
      }
    ]
  },
  {
    tieuDe: "Thành viên",
    muc: [
      { href: "/thanh-vien", nhan: "Hạng & ưu đãi của tôi", chinhXac: true },
      { href: "/thanh-vien/quan-ly", nhan: "Quản lý khách & ưu đãi", vai: ["QUAN_LY", "SALE", "CSKH"] },
      { href: "/thanh-vien/doi-tac", nhan: "Cổng đối tác", vai: ["DOI_TAC"] }
    ]
  },
  {
    tieuDe: "Quản trị",
    muc: [
      { href: "/quan-tri", nhan: "Tổng quan điều hành", chinhXac: true, vai: ["QUAN_LY"] },
      { href: "/quan-tri/phe-duyet", nhan: "Bàn phê duyệt", vai: ["QUAN_LY"] },
      { href: "/quan-tri/ho-so", nhan: "Hồ sơ", vai: ["QUAN_LY"] },
      { href: "/quan-tri/hoa-hong", nhan: "Tỷ lệ hoa hồng", vai: ["QUAN_LY"] },
      { href: "/quan-tri/nhat-ky", nhan: "Nhật ký", vai: ["QUAN_LY"] }
    ]
  },
  {
    tieuDe: "Cá nhân",
    muc: [
      { href: "/thong-bao", nhan: "Thông báo" },
      { href: "/tai-khoan", nhan: "Tài khoản" },
      { href: "/", nhan: "Website Thiên Khuê", chinhXac: true }
    ]
  }
];

/** Ten cu — moi khu dung chung NAV_APP (layout cac khu khong phai sua) */
export const NAV_HOC_VIEN = NAV_APP;
export const NAV_LAM_VIEC = NAV_APP;
export const NAV_QUAN_TRI = NAV_APP;

/** Vai duoc vao khu quan tri */
export const VAI_QUAN_TRI: Vai[] = ["QUAN_LY", "ADMIN", "THIEN_KHUE"];
