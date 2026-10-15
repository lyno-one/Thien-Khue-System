import type { MetadataRoute } from "next";
import { DIA_CHI_WEB } from "@/lib/dia-chi-web";

/** Chi trang cong khai duoc lap chi muc; khu dang nhap / lam viec / quan tri thi khong */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/hoc-vien", "/lam-viec", "/quan-tri", "/thanh-vien", "/tai-khoan", "/dang-nhap", "/dang-ky"]
      }
    ],
    sitemap: `${DIA_CHI_WEB}/sitemap.xml`
  };
}
