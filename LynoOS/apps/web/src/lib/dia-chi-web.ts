/** URL cong khai cua web — OpenGraph (metadataBase), sitemap, robots dung URL tuyet doi */
export const DIA_CHI_WEB = (process.env.NEXT_PUBLIC_SITE_URL || (process.env.NODE_ENV === "production" ? "https://lyno.com.vn" : "http://localhost:3300")).replace(/\/+$/, "");
