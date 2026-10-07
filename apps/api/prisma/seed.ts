/*
 * Seed du lieu mau Thien Khue S — CHI ghi schema thien_khue, IDEMPOTENT (chay lai bao nhieu lan cung duoc).
 * Doc public.mau (san pham CRM) qua CrmDocService — khong ghi gi vao public.
 * Chay: pnpm --filter api seed
 */
import "reflect-metadata";
import { config as napEnv } from "dotenv";
napEnv({ path: [".env.local", ".env"], quiet: true });

import { LoaiKhoaHoc, Prisma, PrismaClient, type Vai } from "@prisma/client";
import { CrmDocService, type MauCrm } from "../src/infrastructure/crm/crm-doc.service";

const prisma = new PrismaClient();
const crmDoc = new CrmDocService(prisma);

// ------------------------------------------------------------------ du lieu khoa hoc (tu LMS.dc.html renderVals())

interface BaiHocMau {
  ma: string;
  tieu_de: string;
  phut: number;
  tom_tat: string;
}
interface ChuongMau {
  ten: string;
  bai: BaiHocMau[];
}
interface CauHoiMau {
  ma: string;
  noi_dung: string;
  lua_chon: string[];
  dap_an: number;
  giai_thich?: string;
}
interface KhoaHocMau {
  ma: string;
  ten: string;
  mo_ta: string;
  loai: LoaiKhoaHoc;
  vai_ap_dung: Vai[];
  mau_sac: string;
  thu_tu: number;
  bat_buoc: boolean;
  can_thuc_hanh?: boolean;
  yeu_cau_thuc_hanh?: string;
  /** Bai thuc hanh qua "Luyện tư vấn với AI" (Sales Training) — docs/TICH-HOP-SALES-TRAINING.md */
  yeu_cau_luyen_ai?: { nguong: number; can: { TU_VAN: number; DOI_TRA: number } };
  mau_id?: string;
  ma_mau?: string;
  chuong: ChuongMau[];
  bai_kiem_tra?: { ma: string; tieu_de: string; cau_hoi: CauHoiMau[] };
}

const VAI_HOC: Vai[] = ["SALE", "CSKH", "CTV", "THUC_TAP", "KOL", "KOC"];

const KHOA_HOC: KhoaHocMau[] = [
  {
    ma: "nhap-mon",
    ten: "Nhập môn LYNO & Thiên Khuê",
    mo_ta: "Nền tảng cho mọi vai trò: thương hiệu, sản phẩm, khách hàng và chính sách bán hàng.",
    loai: "NEN_TANG",
    vai_ap_dung: VAI_HOC,
    mau_sac: "#6A4CE0",
    thu_tu: 1,
    bat_buoc: true,
    chuong: [
      {
        ten: "Thương hiệu",
        bai: [
          { ma: "o1", tieu_de: "Câu chuyện LYNO & khăn lụa Thiên Khuê", phut: 8, tom_tat: "LYNO thành lập năm 2018, thời trang công sở nữ phân khúc trung – cao cấp. Thiên Khuê là thương hiệu khăn lụa riêng thuộc một pháp nhân khác, được phân phối trên LYNO." },
          { ma: "o2", tieu_de: "Định vị & giá trị cốt lõi", phut: 10, tom_tat: "Phương châm “Khách hàng là trung tâm”. Giá trị cốt lõi: Chất lượng – Chính trực – Trách nhiệm – Đổi mới. Phong cách kết hợp cổ điển và hiện đại, sang trọng mà phóng khoáng." }
        ]
      },
      {
        ten: "Sản phẩm & khách hàng",
        bai: [
          { ma: "o3", tieu_de: "Danh mục & khoảng giá", phut: 12, tom_tat: "Từ sơ mi công sở 299.000đ đến blazer, đầm/set trên 1 triệu; khăn lụa Thiên Khuê 350.000đ – 546.000đ. Nhiều mẫu đang có giá sale — luôn kiểm tra giá hiện hành trước khi báo khách." },
          { ma: "o4", tieu_de: "Hai nhóm khách hàng", phut: 10, tom_tat: "Dòng sơ mi cơ bản: 25–45 tuổi, size S–3XL, cần dễ mặc, dễ phối, không lỗi mốt. Dòng họa tiết, áo kiểu, chân váy, đầm: 30–45 tuổi, cần sự chuyên nghiệp và điểm nhấn tinh tế." }
        ]
      },
      {
        ten: "Chính sách",
        bai: [{ ma: "o5", tieu_de: "Giao hàng, đổi trả, thanh toán", phut: 6, tom_tat: "Phí ship 20.000đ, freeship đơn từ 450.000đ. Đổi trả trong 7 ngày. Thu COD toàn quốc, khách được đồng kiểm tại nhà." }]
      }
    ],
    bai_kiem_tra: {
      ma: "kt-nhap-mon",
      tieu_de: "Kiểm tra Nhập môn",
      cau_hoi: [
        { ma: "q1", noi_dung: "Đơn hàng từ bao nhiêu thì được miễn phí giao hàng?", lua_chon: ["300.000đ", "450.000đ", "500.000đ", "1.000.000đ"], dap_an: 1 },
        { ma: "q2", noi_dung: "Khách được đổi trả trong thời hạn bao lâu?", lua_chon: ["3 ngày", "5 ngày", "7 ngày", "14 ngày"], dap_an: 2 },
        { ma: "q3", noi_dung: "Dòng sơ mi cơ bản có dải size nào?", lua_chon: ["S – XL", "M – 2XL", "S – 3XL", "Freesize"], dap_an: 2 },
        { ma: "q4", noi_dung: "Cách gọi khách phù hợp giọng văn LYNO?", lua_chon: ["“Nàng”", "“Sis”", "“Bạn” hoặc “chị”", "“Cưng”"], dap_an: 2 },
        { ma: "q5", noi_dung: "Khăn lụa Thiên Khuê thuộc pháp nhân nào?", lua_chon: ["Công ty CP SX & XNK HNC", "Công ty TNHH TM & DV Thiên Khuê", "Chi nhánh LYNO Phú Nhuận", "Hộ kinh doanh cá thể"], dap_an: 1 }
      ]
    }
  },
  {
    ma: "sale-cskh",
    ten: "Sale / CSKH chuẩn LYNO",
    mo_ta: "Tư vấn size, phối đồ, xử lý băn khoăn về giá và chăm sóc sau bán theo giọng văn thương hiệu.",
    loai: "NGHIEP_VU",
    vai_ap_dung: ["SALE", "CSKH"],
    mau_sac: "#007A70",
    thu_tu: 2,
    bat_buoc: true,
    can_thuc_hanh: true,
    yeu_cau_thuc_hanh:
      "Luyện tư vấn với AI trên Sales Training: đạt 1 phiên tư vấn bán hàng và 1 phiên tình huống đổi trả (từ 80 điểm, không hứa sai chính sách). Đủ hai phiên, bài tự chuyển cho mentor duyệt.",
    yeu_cau_luyen_ai: { nguong: 80, can: { TU_VAN: 1, DOI_TRA: 1 } },
    chuong: [
      {
        ten: "Tư vấn",
        bai: [
          { ma: "s1", tieu_de: "Tư vấn size S–3XL", phut: 12, tom_tat: "Hỏi số đo và thói quen mặc, gợi ý size theo từng dòng sản phẩm; tự tin tư vấn cho khách size lớn." },
          { ma: "s2", tieu_de: "Gợi ý phối đồ theo dịp", phut: 10, tom_tat: "Đi làm, gặp đối tác, dự tiệc — phối sơ mi, chân váy, blazer cùng khăn lụa Thiên Khuê." },
          { ma: "s3", tieu_de: "Xử lý băn khoăn về giá", phut: 10, tom_tat: "Nói về chất liệu, đường may và độ bền phong cách thay vì giảm giá; giữ định vị trung – cao cấp." }
        ]
      },
      {
        ten: "Sau bán",
        bai: [
          { ma: "s4", tieu_de: "Quy trình đổi trả 7 ngày", phut: 8, tom_tat: "Tiếp nhận yêu cầu, kiểm tra điều kiện, xác nhận phương án đổi hoặc trả và cập nhật đơn." },
          { ma: "s5", tieu_de: "Xử lý khiếu nại", phut: 12, tom_tat: "Lắng nghe, xin lỗi đúng mực, đưa phương án cụ thể và theo dõi đến khi khách hài lòng." }
        ]
      }
    ],
    bai_kiem_tra: {
      ma: "kt-sale-cskh",
      tieu_de: "Kiểm tra Sale / CSKH",
      cau_hoi: [
        { ma: "q1", noi_dung: "Trước khi gợi ý size, việc đầu tiên nên làm là gì?", lua_chon: ["Báo giá ngay", "Hỏi số đo và thói quen mặc", "Gửi bảng size rồi để khách tự chọn", "Gợi ý size M cho mọi khách"], dap_an: 1 },
        { ma: "q2", noi_dung: "Khách chê giá cao, cách xử lý đúng định vị LYNO là?", lua_chon: ["Giảm giá ngay", "Nói về chất liệu, đường may, độ bền phong cách", "So sánh với hàng chợ", "Bỏ qua tin nhắn"], dap_an: 1 },
        { ma: "q3", noi_dung: "Khách yêu cầu đổi hàng ở ngày thứ 5 sau khi nhận — xử lý thế nào?", lua_chon: ["Từ chối vì quá hạn", "Tiếp nhận, kiểm tra điều kiện đổi trả 7 ngày", "Bảo khách tự gửi về kho", "Chuyển cho kế toán"], dap_an: 1 },
        { ma: "q4", noi_dung: "Bước cuối cùng khi xử lý khiếu nại là gì?", lua_chon: ["Đóng hội thoại ngay", "Theo dõi đến khi khách hài lòng", "Xoá đơn", "Gửi mã giảm giá cho mọi khách"], dap_an: 1 }
      ]
    }
  },
  {
    ma: "ctv-online",
    ten: "CTV online",
    mo_ta: "Bán hàng trên kênh cá nhân, gửi đơn về hệ thống và theo dõi hoa hồng.",
    loai: "NGHIEP_VU",
    vai_ap_dung: ["CTV", "THUC_TAP"],
    mau_sac: "#FFD166",
    thu_tu: 3,
    bat_buoc: true,
    can_thuc_hanh: true,
    yeu_cau_thuc_hanh: "Đăng một bài giới thiệu sản phẩm đã được cấp quyền trên kênh cá nhân (đúng giọng văn thương hiệu) và nộp đường dẫn bài đăng.",
    chuong: [
      {
        ten: "Bắt đầu",
        bai: [
          { ma: "c1", tieu_de: "Tài khoản & không gian làm việc", phut: 6, tom_tat: "Cách nhận đơn, theo dõi đơn và hoa hồng trong không gian làm việc CTV trên Thiên Khuê S." },
          { ma: "c2", tieu_de: "Bảng giá & chính sách cho CTV", phut: 8, tom_tat: "Giá bán, chính sách giao hàng và đổi trả. Tỷ lệ hoa hồng: [cần xác nhận]." }
        ]
      },
      {
        ten: "Bán hàng",
        bai: [
          { ma: "c3", tieu_de: "Đăng bài trên kênh cá nhân", phut: 12, tom_tat: "Chọn ảnh sản phẩm, viết lời giới thiệu gọn, tinh tế, đúng giọng văn thương hiệu." },
          { ma: "c4", tieu_de: "Trả lời khách & gửi đơn", phut: 10, tom_tat: "Trả lời inbox, xác nhận size và địa chỉ, gửi đơn về hệ thống để giao hàng COD." }
        ]
      }
    ],
    bai_kiem_tra: {
      ma: "kt-ctv-online",
      tieu_de: "Kiểm tra CTV online",
      cau_hoi: [
        { ma: "q1", noi_dung: "CTV được lấy mã giới thiệu cho sản phẩm nào?", lua_chon: ["Mọi sản phẩm trên lyno.vn", "Chỉ sản phẩm đã học đạt và được cấp quyền", "Sản phẩm đang sale", "Sản phẩm bán chạy nhất"], dap_an: 1 },
        { ma: "q2", noi_dung: "Trước khi gửi đơn về hệ thống cần xác nhận gì với khách?", lua_chon: ["Size và địa chỉ giao hàng", "Số tài khoản ngân hàng của khách", "Ngày sinh", "Không cần xác nhận"], dap_an: 0 },
        { ma: "q3", noi_dung: "Một đơn có cả mã giới thiệu của bạn và Sale chốt đơn thì sao?", lua_chon: ["Cả hai cùng nhận hoa hồng", "Đơn chờ xác minh, chỉ một người được ghi nhận", "Người đến trước nhận", "Không ai nhận"], dap_an: 1 }
      ]
    }
  },
  {
    ma: "kol-koc",
    ten: "KOL / KOC",
    mo_ta: "Brief thương hiệu, sản xuất nội dung review và video ngắn, đo lường hiệu quả.",
    loai: "NGHIEP_VU",
    vai_ap_dung: ["KOL", "KOC"],
    mau_sac: "#2B59E6",
    thu_tu: 4,
    bat_buoc: true,
    can_thuc_hanh: true,
    yeu_cau_thuc_hanh: "Nộp một kịch bản video ngắn (hook 3 giây đầu, cảnh phối đồ, lời kêu gọi hành động) cho một sản phẩm đã được cấp quyền.",
    chuong: [
      {
        ten: "Brief",
        bai: [
          { ma: "k1", tieu_de: "Giọng văn thương hiệu", phut: 8, tom_tat: "Chuyên nghiệp, sang trọng, giữ khoảng cách vừa phải. Gọi khách là “bạn” hoặc “chị”, tránh “nàng”, “sis”." },
          { ma: "k2", tieu_de: "Điều nên & không nên", phut: 8, tom_tat: "Tập trung vào chất liệu, form dáng, sự tự tin khi mặc; không cam kết quá mức, không dùng teencode." }
        ]
      },
      {
        ten: "Sản xuất",
        bai: [
          { ma: "k3", tieu_de: "Review sản phẩm", phut: 12, tom_tat: "Cho thấy chất liệu cận cảnh, form dáng khi mặc và gợi ý phối đồ thực tế." },
          { ma: "k4", tieu_de: "Video ngắn TikTok / Reels", phut: 15, tom_tat: "Hook trong 3 giây đầu, cảnh phối đồ rõ ràng, lời kêu gọi hành động cụ thể." }
        ]
      },
      { ten: "Đo lường", bai: [{ ma: "k5", tieu_de: "Mã giới thiệu & báo cáo", phut: 6, tom_tat: "Theo dõi lượt xem và đơn hàng qua mã giới thiệu. Cơ chế booking: [cần xác nhận]." }] }
    ],
    bai_kiem_tra: {
      ma: "kt-kol-koc",
      tieu_de: "Kiểm tra KOL / KOC",
      cau_hoi: [
        { ma: "q1", noi_dung: "Video ngắn cần giữ chân người xem trong bao lâu đầu tiên?", lua_chon: ["3 giây", "30 giây", "1 phút", "Không quan trọng"], dap_an: 0 },
        { ma: "q2", noi_dung: "Điều nào KHÔNG nên làm khi review sản phẩm LYNO?", lua_chon: ["Quay cận chất liệu", "Gợi ý phối đồ", "Cam kết quá mức, dùng teencode", "Cho thấy form dáng khi mặc"], dap_an: 2 },
        { ma: "q3", noi_dung: "Hiệu quả nội dung được ghi nhận qua đâu?", lua_chon: ["Mã giới thiệu gắn sản phẩm", "Số lượt follow", "Tin nhắn riêng", "Không theo dõi"], dap_an: 0 }
      ]
    }
  }
];

// ------------------------------------------------------------------ khoa SAN_PHAM tu public.mau

const dinhDangTien = (n: number | null) => (n == null ? "[chưa có giá]" : `${n.toLocaleString("vi-VN")}đ`);

function moTaSizeChart(sc: unknown): string {
  if (!sc) return "Bảng size: [cần bổ sung trên CRM].";
  if (Array.isArray(sc)) return "Bảng size:\n\n" + sc.map(d => `- ${typeof d === "object" ? JSON.stringify(d) : String(d)}`).join("\n");
  if (typeof sc === "object") return "Bảng size:\n\n" + Object.entries(sc as Record<string, unknown>).map(([k, v]) => `- **${k}**: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`).join("\n");
  return `Bảng size: ${String(sc)}`;
}

/** Lua chon nhieu dap an: dap an dung + cac gia tri khac (xao tron co dinh theo ma) */
function taoLuaChon(dung: string, khac: string[], hat: string): { lua_chon: string[]; dap_an: number } {
  const nhieu = [...new Set(khac.filter(k => k && k !== dung))].slice(0, 3);
  const ds = [dung, ...nhieu];
  const vt = hat.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % ds.length;
  [ds[0], ds[vt]] = [ds[vt], ds[0]];
  return { lua_chon: ds, dap_an: vt };
}

async function khoaSanPham(): Promise<KhoaHocMau[]> {
  const dsMau = await crmDoc.layDanhSachMau({});
  const chon = [...dsMau.filter(m => m.trang_thai === "dang_ban"), ...dsMau.filter(m => m.trang_thai !== "dang_ban")].slice(0, 4);
  const kq: KhoaHocMau[] = [];
  for (const [i, m] of chon.entries()) kq.push(await khoaChoMau(m, dsMau, i));
  return kq;
}

async function khoaChoMau(m: MauCrm, tatCa: MauCrm[], i: number): Promise<KhoaHocMau> {
  const ton = await crmDoc.layTonKho(m.id);
  const sizes = [...new Set(ton.map(t => t.size).filter(Boolean))];
  const mauSac = [...new Set(ton.map(t => t.mau_sac).filter(Boolean))];
  const chatLieu = m.chat_lieu ?? "[cần bổ sung]";
  const gia = dinhDangTien(m.gia_ban);
  const cau: CauHoiMau[] = [];
  if (m.chat_lieu) {
    cau.push({ ma: "q1", noi_dung: `Mẫu ${m.ma} — ${m.ten} dùng chất liệu gì?`, ...taoLuaChon(m.chat_lieu, [...tatCa.map(x => x.chat_lieu ?? ""), "Kate", "Lụa tơ tằm", "Thô"], m.ma + "cl") });
  }
  if (m.gia_ban != null) {
    const g = m.gia_ban;
    cau.push({ ma: "q2", noi_dung: `Giá bán niêm yết hiện hành của ${m.ma} là bao nhiêu?`, ...taoLuaChon(dinhDangTien(g), [dinhDangTien(g + 50000), dinhDangTien(Math.max(g - 50000, 99000)), dinhDangTien(g + 100000)], m.ma + "gia") });
  }
  cau.push({ ma: "q3", noi_dung: `Sản phẩm nào có mã ${m.ma}?`, ...taoLuaChon(m.ten, [...tatCa.map(x => x.ten), "Áo len cổ lọ", "Quần âu ống đứng"], m.ma + "ten") });
  cau.push({
    ma: "q4",
    noi_dung: `Trước khi báo giá ${m.ma} cho khách, bạn cần làm gì?`,
    lua_chon: ["Kiểm tra giá hiện hành và tồn kho size / màu", "Báo theo giá nhớ được", "Hứa giảm giá để chốt nhanh", "Không cần kiểm tra"],
    dap_an: 0
  });

  return {
    ma: `sp-${m.ma.toLowerCase()}`,
    ten: `${m.ma} · ${m.ten}`,
    mo_ta: `Kiến thức sản phẩm ${m.ten}: chất liệu, phom dáng, size, giá bán và lưu ý tư vấn. Học + thi đạt để được cấp quyền bán mã ${m.ma}.`,
    loai: "SAN_PHAM",
    vai_ap_dung: ["SALE", "CSKH", "CTV", "KOL", "KOC"],
    mau_sac: "#14213D",
    thu_tu: 10 + i,
    bat_buoc: false,
    mau_id: m.id,
    ma_mau: m.ma,
    chuong: [
      {
        ten: "Sản phẩm",
        bai: [
          { ma: "p1", tieu_de: "Chất liệu & phom dáng", phut: 6, tom_tat: `Chất liệu: ${chatLieu}. Phom dáng: ${m.form_dang ?? "[cần bổ sung]"}.` },
          {
            ma: "p2",
            tieu_de: "Size & màu",
            phut: 6,
            tom_tat: `${sizes.length ? `Size đang có: ${sizes.join(", ")}.` : "Size: xem bảng size."} ${mauSac.length ? `Màu: ${mauSac.join(", ")}.` : ""}`.trim()
          },
          { ma: "p3", tieu_de: "Giá & lưu ý tư vấn", phut: 5, tom_tat: `Giá bán: ${gia}. ${m.cau_tu_van ?? "Luôn kiểm tra giá hiện hành trước khi báo khách."}` }
        ]
      }
    ],
    bai_kiem_tra: { ma: `kt-sp-${m.ma.toLowerCase()}`, tieu_de: `Kiểm tra sản phẩm ${m.ma}`, cau_hoi: cau }
  };
}

/** Noi dung markdown cua bai (ban dau = tom tat trong thiet ke; LMS admin bo sung sau) */
function noiDungBai(b: BaiHocMau): string {
  return `## ${b.tieu_de}\n\n${b.tom_tat}\n`;
}

// ------------------------------------------------------------------ ghi

async function ghiKhoaHoc(m: KhoaHocMau, sizeChart?: unknown): Promise<{ bai: number; cau: number }> {
  const chung = {
    ten: m.ten,
    mo_ta: m.mo_ta,
    loai: m.loai,
    vai_ap_dung: m.vai_ap_dung,
    mau_id: m.mau_id ?? null,
    ma_mau: m.ma_mau ?? null,
    bat_buoc: m.bat_buoc,
    can_thuc_hanh: m.can_thuc_hanh ?? false,
    yeu_cau_thuc_hanh: m.yeu_cau_thuc_hanh ?? null,
    // Chi ghi khi khoa mau co cau hinh — khong xoa cau hinh quan tri tu bat o khoa khac
    ...(m.yeu_cau_luyen_ai ? { yeu_cau_luyen_ai: m.yeu_cau_luyen_ai } : {}),
    mau_sac: m.mau_sac,
    thu_tu: m.thu_tu
  };
  // Khong dong phien_ban_tai_lieu khi seed lai (tranh day quyen SKU sang CAN_HOC_LAI)
  const kh = await prisma.khoa_hoc.upsert({ where: { ma: m.ma }, create: { ma: m.ma, ...chung }, update: chung });

  let thuTu = 0;
  let soBai = 0;
  for (const c of m.chuong) {
    for (const b of c.bai) {
      thuTu++;
      let noiDung = noiDungBai(b);
      if (m.loai === "SAN_PHAM" && b.ma === "p2") noiDung = `## ${b.tieu_de}\n\n${b.tom_tat}\n\n${moTaSizeChart(sizeChart)}\n`;
      const duLieu = { tieu_de: b.tieu_de, chuong: c.ten, noi_dung: noiDung, tom_tat: b.tom_tat, thoi_luong_phut: b.phut, thu_tu: thuTu };
      await prisma.bai_hoc.upsert({
        where: { khoa_hoc_id_ma: { khoa_hoc_id: kh.id, ma: b.ma } },
        create: { khoa_hoc_id: kh.id, ma: b.ma, ...duLieu },
        update: duLieu
      });
      soBai++;
    }
  }

  let soCau = 0;
  if (m.bai_kiem_tra) {
    const bkt = await prisma.bai_kiem_tra.upsert({
      where: { ma: m.bai_kiem_tra.ma },
      create: { ma: m.bai_kiem_tra.ma, khoa_hoc_id: kh.id, tieu_de: m.bai_kiem_tra.tieu_de, nguong_dat: 90, bat_buoc: true },
      update: { khoa_hoc_id: kh.id, tieu_de: m.bai_kiem_tra.tieu_de }
    });
    for (const [i, q] of m.bai_kiem_tra.cau_hoi.entries()) {
      const duLieu = {
        noi_dung: q.noi_dung,
        lua_chon: q.lua_chon as Prisma.InputJsonValue,
        dap_an: [q.dap_an] as Prisma.InputJsonValue,
        giai_thich: q.giai_thich ?? null,
        thu_tu: i + 1
      };
      await prisma.cau_hoi.upsert({
        where: { bai_kiem_tra_id_ma: { bai_kiem_tra_id: bkt.id, ma: q.ma } },
        create: { bai_kiem_tra_id: bkt.id, ma: q.ma, ...duLieu },
        update: duLieu
      });
      soCau++;
    }
  }
  return { bai: soBai, cau: soCau };
}

async function seedHangThanhVien() {
  const ds = [
    { hang: "THAN_THIET" as const, ten: "Khách Thân thiết", nguong: 50_000_000, giam: 5, thu_tu: 1, quyen_loi: "Giảm 5% mọi đơn hàng." },
    { hang: "VIP" as const, ten: "Khách VIP", nguong: 100_000_000, giam: 10, thu_tu: 2, quyen_loi: "Giảm 10% và tiếp cận voucher / quà tặng đặc quyền từ đối tác." }
  ];
  for (const h of ds) {
    const duLieu = { ten: h.ten, nguong_tich_luy: new Prisma.Decimal(h.nguong), giam_gia_phan_tram: new Prisma.Decimal(h.giam), thu_tu: h.thu_tu, quyen_loi: h.quyen_loi };
    await prisma.hang_thanh_vien_cau_hinh.upsert({ where: { hang: h.hang }, create: { hang: h.hang, ...duLieu }, update: duLieu });
  }
  return ds.length;
}

async function seedTyLeHoaHong() {
  // Ty le mac dinh theo vai (mau_id null) — TAM, can Thien Khue xac nhan (thiet ke ghi "[cần xác nhận]")
  const ds: { vai: Vai; ty_le: number }[] = [
    { vai: "SALE", ty_le: 2 },
    { vai: "CTV", ty_le: 10 },
    { vai: "THUC_TAP", ty_le: 5 },
    { vai: "KOC", ty_le: 8 },
    { vai: "KOL", ty_le: 10 }
  ];
  let moi = 0;
  for (const d of ds) {
    const daCo = await prisma.ty_le_hoa_hong.findFirst({ where: { vai: d.vai, mau_id: null } });
    if (daCo) continue;
    await prisma.ty_le_hoa_hong.create({ data: { vai: d.vai, ty_le: new Prisma.Decimal(d.ty_le), ghi_chu: "Tỷ lệ tạm từ seed — cần Thiên Khuê xác nhận" } });
    moi++;
  }
  return moi;
}

async function main() {
  const hang = await seedHangThanhVien();
  const tyLe = await seedTyLeHoaHong();
  const tong = { khoa: 0, bai: 0, cau: 0 };
  for (const k of KHOA_HOC) {
    const r = await ghiKhoaHoc(k);
    tong.khoa++;
    tong.bai += r.bai;
    tong.cau += r.cau;
  }
  const sp = await khoaSanPham();
  for (const k of sp) {
    const mau = k.mau_id ? await crmDoc.layMau(k.mau_id) : null;
    const r = await ghiKhoaHoc(k, mau?.size_chart);
    tong.khoa++;
    tong.bai += r.bai;
    tong.cau += r.cau;
  }
  console.log(
    `Seed xong: ${hang} hạng thành viên, ${tyLe} tỷ lệ hoa hồng mới, ${tong.khoa} khoá học (${sp.map(k => k.ma_mau).join(", ") || "không có mẫu CRM"}), ${tong.bai} bài học, ${tong.cau} câu hỏi.`
  );
}

main()
  .catch(e => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
