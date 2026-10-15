import type { Metadata } from "next";
import { CONG_TY, LIEN_HE, LIEN_HE_EN, TrangPhapLy } from "@/features/storefront/trang-phap-ly";

export const metadata: Metadata = {
  title: "Chính sách bảo mật",
  description: "Chính sách bảo mật thông tin của LYNO, gồm dữ liệu từ TikTok khi dùng công cụ LYNO Affiliate.",
  alternates: { canonical: "/chinh-sach-bao-mat" }
};

export default function Trang() {
  return (
    <TrangPhapLy
      tieuDe="Chính sách bảo mật"
      capNhat="15/10/2026"
      muc={[
        { tieuDe: "1. Đơn vị quản lý dữ liệu", doan: [`${CONG_TY}, quản lý thương hiệu LYNO, website lyno.vn, lyno.com.vn và công cụ LYNO Affiliate.`] },
        { tieuDe: "2. Thông tin khách hàng", doan: ["Khi mua hàng hoặc nhắn tin tư vấn, chúng tôi thu thập họ tên, số điện thoại, địa chỉ giao hàng và nội dung trao đổi, chỉ để xử lý đơn hàng, giao hàng, chăm sóc sau bán và gửi khuyến mãi khi khách đồng ý."] },
        {
          tieuDe: "3. Dữ liệu từ TikTok",
          doan: [
            "Khi kết nối tài khoản TikTok với công cụ LYNO Affiliate, chúng tôi chỉ nhận:",
            [
              "Tên hiển thị và ảnh đại diện (quyền user.info.basic).",
              "Mã truy cập (access token, refresh token) để đăng video theo yêu cầu của người dùng (quyền video.upload, video.publish).",
              "Danh sách video đã đăng qua công cụ để theo dõi trạng thái (quyền video.list)."
            ],
            "Mã truy cập được mã hoá khi lưu trữ. Dữ liệu chỉ dùng để đăng và theo dõi video của chính LYNO, không dùng để quảng cáo nhắm mục tiêu, không bán hay chia sẻ cho bên thứ ba."
          ]
        },
        { tieuDe: "4. Chia sẻ thông tin", doan: ["Chúng tôi chỉ chia sẻ thông tin cần thiết với đơn vị vận chuyển và cổng thanh toán để hoàn tất đơn hàng, hoặc khi cơ quan nhà nước có thẩm quyền yêu cầu theo pháp luật."] },
        { tieuDe: "5. Lưu trữ và xoá dữ liệu", doan: ["Dữ liệu được lưu trong thời gian cần thiết cho các mục đích nêu trên. Người dùng có thể ngắt kết nối TikTok bất cứ lúc nào (trong công cụ hoặc trong ứng dụng TikTok) và yêu cầu xem, sửa hoặc xoá dữ liệu cá nhân qua thông tin liên hệ bên dưới; chúng tôi xử lý trong vòng 30 ngày."] },
        { tieuDe: "6. Liên hệ", doan: [LIEN_HE] }
      ]}
      banAnh={{
        tieuDe: "Privacy Policy",
        muc: [
          { tieuDe: "1. Data controller", doan: ["HNC Production and Import-Export JSC (Business Registration No. 0315025015), operator of the LYNO brand, lyno.vn, lyno.com.vn and the LYNO Affiliate tool."] },
          { tieuDe: "2. Customer information", doan: ["When customers order or message us, we collect name, phone number, shipping address and conversation content, used only to process and deliver orders, provide after-sales support and, with consent, send promotions."] },
          {
            tieuDe: "3. TikTok data",
            doan: [
              "When a TikTok account is connected to LYNO Affiliate, we only receive:",
              [
                "Display name and avatar (user.info.basic).",
                "Access and refresh tokens, used to publish videos at the user’s request (video.upload, video.publish).",
                "The list of videos posted through the tool, to track their status (video.list)."
              ],
              "Tokens are encrypted at rest. This data is used solely to publish and track LYNO’s own videos; it is not used for ad targeting and is never sold or shared with third parties."
            ]
          },
          { tieuDe: "4. Sharing", doan: ["We share only what is necessary with shipping carriers and payment gateways to fulfil orders, or with authorities when required by law."] },
          { tieuDe: "5. Retention and deletion", doan: ["Data is kept only as long as needed for the purposes above. Users can disconnect TikTok at any time (in the tool or in the TikTok app) and request access, correction or deletion of their personal data using the contact below; requests are handled within 30 days."] },
          { tieuDe: "6. Contact", doan: [LIEN_HE_EN] }
        ]
      }}
    />
  );
}
