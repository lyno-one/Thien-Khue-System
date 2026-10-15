import type { Metadata } from "next";
import { CONG_TY, LIEN_HE, LIEN_HE_EN, TrangPhapLy } from "@/features/storefront/trang-phap-ly";

export const metadata: Metadata = {
  title: "Điều khoản sử dụng",
  description: "Điều khoản sử dụng website LYNO và công cụ LYNO Affiliate (kết nối TikTok, Facebook).",
  alternates: { canonical: "/dieu-khoan-su-dung" }
};

export default function Trang() {
  return (
    <TrangPhapLy
      tieuDe="Điều khoản sử dụng"
      capNhat="15/10/2026"
      muc={[
        { tieuDe: "1. Giới thiệu", doan: [`Website lyno.vn, lyno.com.vn và công cụ "LYNO Affiliate" thuộc ${CONG_TY}. Khi sử dụng website hoặc công cụ, bạn đồng ý với các điều khoản dưới đây.`] },
        { tieuDe: "2. Mua hàng", doan: ["Giá, khuyến mãi, đổi trả, thanh toán và vận chuyển áp dụng theo các chính sách đăng trên lyno.vn. LYNO có thể cập nhật giá và thông tin sản phẩm mà không cần báo trước."] },
        {
          tieuDe: "3. Công cụ LYNO Affiliate và kết nối TikTok",
          doan: [
            "LYNO Affiliate là công cụ nội bộ để LYNO đăng video sản phẩm của chính thương hiệu lên tài khoản TikTok của LYNO. Khi kết nối tài khoản TikTok, người dùng cho phép công cụ:",
            [
              "Đọc thông tin cơ bản (tên hiển thị, ảnh đại diện) để hiển thị tài khoản đã kết nối.",
              "Tải lên và đăng video do người dùng chủ động chọn và bấm “Đăng”.",
              "Xem danh sách video đã đăng qua công cụ để theo dõi trạng thái."
            ],
            "Công cụ không đăng bất cứ nội dung nào khi chưa có thao tác xác nhận của người dùng. Người dùng có thể ngắt kết nối bất cứ lúc nào trong phần cài đặt của công cụ hoặc trong ứng dụng TikTok (Cài đặt và quyền riêng tư → Bảo mật → Ứng dụng và dịch vụ).",
            "Việc sử dụng TikTok còn phải tuân theo Điều khoản dịch vụ và Nguyên tắc cộng đồng của TikTok."
          ]
        },
        { tieuDe: "4. Nội dung", doan: ["Người dùng chịu trách nhiệm về nội dung mình đăng; không đăng nội dung vi phạm pháp luật, bản quyền hoặc chính sách của nền tảng. Nội dung có sử dụng AI được gắn nhãn theo quy định của nền tảng."] },
        { tieuDe: "5. Giới hạn trách nhiệm", doan: ["LYNO không chịu trách nhiệm về gián đoạn dịch vụ do nền tảng bên thứ ba (TikTok, Facebook…) gây ra."] },
        { tieuDe: "6. Liên hệ", doan: [LIEN_HE] }
      ]}
      banAnh={{
        tieuDe: "Terms of Service",
        muc: [
          { tieuDe: "1. About", doan: ["lyno.vn, lyno.com.vn and the “LYNO Affiliate” tool are operated by HNC Production and Import-Export JSC (Business Registration No. 0315025015). By using the website or the tool you agree to these terms."] },
          { tieuDe: "2. Purchases", doan: ["Prices, promotions, returns, payment and shipping follow the policies published on lyno.vn."] },
          {
            tieuDe: "3. LYNO Affiliate and TikTok",
            doan: [
              "LYNO Affiliate is an internal tool that lets LYNO publish its own product videos to LYNO’s TikTok account. By connecting a TikTok account, the user allows the tool to:",
              [
                "Read basic profile info (display name, avatar) to show which account is connected.",
                "Upload and publish videos that the user explicitly selects and confirms by clicking “Post”.",
                "List videos posted through the tool to track their status."
              ],
              "Nothing is posted without the user’s confirmation. Users can disconnect at any time in the tool’s settings or in the TikTok app (Settings and privacy → Security → Apps and services). Use of TikTok is also subject to TikTok’s Terms of Service and Community Guidelines."
            ]
          },
          { tieuDe: "4. Content", doan: ["Users are responsible for the content they post and must not post unlawful or infringing content. AI-generated content is labelled as required by the platform."] },
          { tieuDe: "5. Liability", doan: ["LYNO is not liable for interruptions caused by third-party platforms (TikTok, Facebook, etc.)."] },
          { tieuDe: "6. Contact", doan: [LIEN_HE_EN] }
        ]
      }}
    />
  );
}
