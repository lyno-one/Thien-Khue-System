import type { LoTrinhDangKy, TrangLienHe, Vai } from "@thien-khue/contracts";

/*
 * Noi dung tinh cua trang cong khai — chep tu renderVals() trong Main.dc.html.
 * Cho ghi [...] la du lieu thiet ke chua co (giu nguyen lam chu cho).
 */

export const LYNO = "https://lyno.vn/";

export interface MucKhoi {
  no: string;
  title: string;
  text: string;
}

export interface CauHinhForm {
  title: string;
  selectLabel: string;
  options: string[];
  noteLabel: string;
  cta: string;
}

export interface TrangVaiTro {
  trang: Extract<TrangLienHe, "VIP" | "THAN_THIEN" | "DOI_TAC">;
  hero: { kicker: string; title: string; lead: string };
  block: { heading: string; items: MucKhoi[]; note: string };
  form: CauHinhForm;
}

export const TRANG_VAI_TRO: Record<"vip" | "than-thien" | "doi-tac", TrangVaiTro> = {
  vip: {
    trang: "VIP",
    hero: {
      kicker: "Thành viên VIP",
      title: "Đặc quyền dành cho người phụ nữ bản lĩnh",
      lead: "Dành cho khách hàng gắn bó lâu năm với LYNO và khăn lụa Thiên Khuê: tư vấn riêng, ưu tiên bộ sưu tập mới và chăm sóc trọn vẹn."
    },
    block: {
      heading: "Quyền lợi thành viên",
      items: [
        { no: "01", title: "Tư vấn phối đồ 1:1", text: "Gợi ý trang phục theo vóc dáng và lịch làm việc của bạn." },
        { no: "02", title: "Ưu tiên bộ sưu tập mới", text: "Xem trước và đặt giữ mẫu trước khi mở bán rộng rãi." },
        { no: "03", title: "Ưu đãi riêng", text: "Ưu đãi sinh nhật và dịp đặc biệt: [mức ưu đãi cần xác nhận]." }
      ],
      note: "Điều kiện trở thành VIP: [tiêu chí cần xác nhận]."
    },
    form: {
      title: "Đăng ký thành viên VIP",
      selectLabel: "Bạn đã mua hàng tại LYNO?",
      options: ["Đã mua nhiều lần", "Đã mua 1 lần", "Chưa mua"],
      noteLabel: "Phong cách bạn yêu thích",
      cta: "Đăng ký VIP"
    }
  },
  "than-thien": {
    trang: "THAN_THIEN",
    hero: {
      kicker: "Cộng đồng",
      title: "Nơi những người yêu sự tinh tế gặp nhau",
      lead: "Kết nối, chia sẻ cách phối đồ và nhận quyền lợi khi đồng hành cùng LYNO và Thiên Khuê."
    },
    block: {
      heading: "Tham gia để nhận",
      items: [
        { no: "01", title: "Tích điểm mỗi đơn hàng", text: "Quy đổi điểm thành ưu đãi: [quy tắc cần xác nhận]." },
        { no: "02", title: "Gợi ý phối đồ mỗi tuần", text: "Cách phối khăn, sơ mi, chân váy cho từng dịp." },
        { no: "03", title: "Giới thiệu bạn bè", text: "Quà cảm ơn khi bạn bè mua hàng qua lời giới thiệu của bạn." }
      ],
      note: "Freeship đơn từ 450.000đ · Đổi trả 7 ngày · Đồng kiểm tại nhà."
    },
    form: {
      title: "Tham gia cộng đồng",
      selectLabel: "Bạn biết đến chúng tôi qua",
      options: ["Facebook", "TikTok", "Cửa hàng", "Bạn bè giới thiệu"],
      noteLabel: "Bạn muốn nhận gợi ý về",
      cta: "Tham gia"
    }
  },
  "doi-tac": {
    trang: "DOI_TAC",
    hero: {
      kicker: "Doanh nghiệp & đối tác",
      title: "Cùng xây dựng giá trị bền vững",
      lead: "Dành cho nữ lãnh đạo, doanh nghiệp và đối tác chiến lược muốn hợp tác cùng LYNO và Thiên Khuê."
    },
    block: {
      heading: "Hình thức hợp tác",
      items: [
        { no: "01", title: "Đồng phục công sở", text: "Trang phục cho đội ngũ nữ trong doanh nghiệp, đủ size S–3XL." },
        { no: "02", title: "Quà tặng khăn lụa", text: "Quà tặng đối tác và sự kiện với khăn lụa Thiên Khuê." },
        { no: "03", title: "Phân phối & đồng tổ chức", text: "Hợp tác phân phối, sự kiện, chương trình dành cho nữ lãnh đạo." }
      ],
      note: "Hợp đồng được ký theo đúng pháp nhân của từng thương hiệu (LYNO / Thiên Khuê)."
    },
    form: {
      title: "Đề nghị hợp tác",
      selectLabel: "Hình thức quan tâm",
      options: ["Đồng phục công sở", "Quà tặng khăn lụa", "Phân phối", "Sự kiện / Khác"],
      noteLabel: "Tên doanh nghiệp & nhu cầu",
      cta: "Gửi đề nghị"
    }
  }
};

export interface LoTrinh {
  label: string;
  heading: string;
  items: MucKhoi[];
  note: string;
  options: string[];
}

export const LO_TRINH: Record<LoTrinhDangKy, LoTrinh> = {
  sale: {
    label: "Sale / CSKH",
    heading: "Lộ trình Sale / CSKH",
    items: [
      { no: "01", title: "Hiểu sản phẩm & khách hàng", text: "Chất liệu, form dáng, bảng size S–3XL và hai nhóm khách hàng chính của LYNO." },
      { no: "02", title: "Tư vấn & chốt đơn", text: "Tư vấn size, phối đồ, xử lý băn khoăn về giá theo giọng văn thương hiệu." },
      { no: "03", title: "Chăm sóc sau bán", text: "Đổi trả 7 ngày, xử lý khiếu nại, chăm sóc khách cũ quay lại." }
    ],
    note: "Đầu ra: sẵn sàng trực inbox, cửa hàng hoặc tổng đài theo quy trình chuẩn.",
    options: ["Sale cửa hàng", "Sale online / Inbox", "CSKH"]
  },
  ctv: {
    label: "CTV online",
    heading: "Lộ trình CTV online",
    items: [
      { no: "01", title: "Làm quen sản phẩm", text: "Danh mục, bảng giá tham khảo, chính sách giao hàng và đổi trả." },
      { no: "02", title: "Bán hàng trên kênh cá nhân", text: "Đăng bài, trả lời khách, gửi đơn về hệ thống." },
      { no: "03", title: "Theo dõi đơn & hoa hồng", text: "Tra cứu đơn và hoa hồng trên không gian làm việc riêng. Tỷ lệ: [cần xác nhận]." }
    ],
    note: "Phù hợp với người muốn kinh doanh linh hoạt thời gian, chưa cần kinh nghiệm.",
    options: ["Bán thời gian", "Toàn thời gian"]
  },
  kol: {
    label: "KOL / KOC",
    heading: "Chương trình KOL / KOC",
    items: [
      { no: "01", title: "Brief thương hiệu", text: "Định vị, giọng văn và những điều nên/không nên khi nói về LYNO & Thiên Khuê." },
      { no: "02", title: "Sản xuất nội dung", text: "Review, phối đồ, video ngắn TikTok/Reels theo chiến dịch." },
      { no: "03", title: "Đo lường & hợp tác dài hạn", text: "Mã giới thiệu, báo cáo hiệu quả và cơ chế booking: [cần xác nhận]." }
    ],
    note: "Ưu tiên nhà sáng tạo có khán giả là phụ nữ công sở.",
    options: ["KOL", "KOC", "Affiliate"]
  },
  other: {
    label: "Chương trình khác",
    heading: "Chương trình khác",
    items: [
      { no: "01", title: "[Tên chương trình]", text: "[Mô tả ngắn — ví dụ: quản lý cửa hàng, đào tạo viên nội bộ]" },
      { no: "02", title: "[Tên chương trình]", text: "[Mô tả ngắn]" },
      { no: "03", title: "[Tên chương trình]", text: "[Mô tả ngắn]" }
    ],
    note: "Mục dự phòng để bổ sung các lộ trình đào tạo mới.",
    options: ["[Chương trình]"]
  }
};

export const THU_TU_LO_TRINH: LoTrinhDangKy[] = ["sale", "ctv", "kol", "other"];

/** Lo trinh -> vai goi y khi chuyen sang /dang-ky (agent ho-so) */
export const VAI_DANG_KY_THEO_LO_TRINH: Partial<Record<LoTrinhDangKy, Vai>> = {
  ctv: "CTV",
  kol: "KOL",
  other: "THUC_TAP"
};

export function laLoTrinh(v: unknown): v is LoTrinhDangKy {
  return typeof v === "string" && (THU_TU_LO_TRINH as string[]).includes(v);
}

/** Link toi khu dang ky lo trinh tren trang Dao tao */
export function linkLoTrinh(lt: LoTrinhDangKy): string {
  return `/dao-tao?lo-trinh=${lt}#dang-ky-lo-trinh`;
}
