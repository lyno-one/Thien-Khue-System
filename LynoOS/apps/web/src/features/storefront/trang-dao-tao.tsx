import Link from "next/link";
import Image from "next/image";
import type { LoTrinhDangKy } from "@thien-khue/contracts";
import { lopChip, lopChipTong, lopKhungDs, lopKicker, lopLienKet, lopNutPhu, NutLienKet } from "@/components/ui";
import { DangKyLoTrinh } from "./dang-ky-lo-trinh";
import { linkLoTrinh } from "./noi-dung";

/*
 * Trang Dao tao (Main.dc.html — nhanh isTrain, "năng lượng sáng tạo"):
 * hero + collage, marquee, lo trinh, cach hoc, goc sang tao, lich hoc, roi khu dang ky lo trinh.
 * Mau theo he trang xanh CRM (DESIGN.md): the trang vien `vien`, o so / icon nen `chinh-nhat`,
 * khoi "Góc sáng tạo" nen xanh dam phang `xanh-800`; khong gradient, khong vang / ngoc / tim.
 */

const LOP_H2 = "m-0 text-h1 text-chu";
/** Chip noi bat tren nen xanh dam */
const LOP_CHIP_TOI = `${lopChip} bg-xanh-100 text-xanh-800`;

function Hero() {
  return (
    <section className="tk-reveal relative overflow-hidden border-b border-vien bg-nen">
      <div className="mx-auto grid max-w-tk grid-cols-1 items-center gap-10 px-4 pb-14 pt-10 md:gap-14 md:px-10 md:pb-20 md:pt-16 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)]">
        <div className="relative z-[1] flex flex-col gap-5 md:gap-6">
          <span className={`tk-up self-start ${lopChip} ${lopChipTong.chinh}`}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M12 3l2.5 5.5L20 11l-5.5 2.5L12 19l-2.5-5.5L4 11l5.5-2.5z" />
            </svg>
            Học viện LynoOS
          </span>
          <h1 className="tk-up tk-d1 m-0 text-hien-thi text-chu">
            Học nghề thời trang.
            <br />
            <span className="text-chinh">Sáng tạo</span> theo
            <br />
            cách của bạn.
          </h1>
          <p className="tk-up tk-d2 m-0 max-w-[560px] text-body-lg text-chu-phu">
            Lộ trình Sale/CSKH, CTV online, KOL/KOC — học online, thực hành với sản phẩm thật của LYNO và khăn lụa Thiên Khuê, nhận chứng chỉ và bắt đầu làm việc ngay trên nền tảng.
          </p>
          <div className="tk-up tk-d3 flex flex-wrap gap-3">
            <NutLienKet href="/hoc-vien" co="lon">
              Học thử bài Nhập môn
            </NutLienKet>
            <NutLienKet href="#dang-ky-lo-trinh" kieu="vien" co="lon">
              Đăng ký lộ trình
            </NutLienKet>
          </div>
          <div className="flex gap-8 pt-2">
            {[
              { so: "4", nhan: "lộ trình" },
              { so: "19", nhan: "bài học" },
              { so: "1:1", nhan: "thực hành tại cửa hàng" }
            ].map(s => (
              <div key={s.nhan} className="flex flex-col">
                <span className="so text-so text-chu">{s.so}</span>
                <span className="text-caption text-chu-phu">{s.nhan}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Collage */}
        <div className="relative h-[460px] md:h-[600px]">
          <svg viewBox="0 0 520 620" width="100%" height="100%" aria-hidden className="tk-float absolute inset-0 text-xanh-100" preserveAspectRatio="none">
            <path d="M-40 520 C 80 380, 200 600, 300 420 S 470 180, 560 260" fill="none" stroke="currentColor" strokeWidth="40" strokeLinecap="round" />
          </svg>
          <div className="absolute left-[4%] top-5 h-[320px] w-[62%] -rotate-2 overflow-hidden rounded-[180px_180px_12px_12px] border border-vien bg-be-mat-phu md:left-[60px] md:h-[440px] md:w-[330px]">
            <Image src="/images/lyno/ao-lua.jpg" alt="Trang phục LYNO dùng minh họa kiến thức phối đồ" fill sizes="(min-width: 768px) 330px, 62vw" className="object-cover object-top" />
          </div>
          <div className="absolute right-0 top-[190px] h-[200px] w-[150px] rotate-[3deg] overflow-hidden rounded-xl border-4 border-be-mat bg-chinh-nhat shadow-md md:top-[250px] md:h-[270px] md:w-[210px]">
            <Image src="/images/lyno/khan-3.jpg" alt="Chi tiết chất liệu khăn lụa Thiên Khuê" fill sizes="(min-width: 768px) 210px, 150px" className="object-cover" />
          </div>
          <div className="tk-bob absolute right-[10px] top-[60px] flex items-center gap-3 rounded-xl border border-vien bg-be-mat px-4 py-3 shadow-lg md:top-[70px]">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-chinh-nhat text-chinh">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M8 5v14l11-7z" />
              </svg>
            </span>
            <span className="flex flex-col">
              <span className="text-caption text-chu-mo">Bài mới</span>
              <span className="text-h4 text-chu">Một khăn — ba cách thắt</span>
            </span>
          </div>
          <div className="tk-bob absolute bottom-[30px] left-5 flex items-center gap-3 rounded-xl border border-vien bg-be-mat px-4 py-3 shadow-lg">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-thanh-cong-nhat text-thanh-cong">
              <svg width="22" height="22" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M20 3 L37 20 L20 37 L3 20 Z" />
                <path d="M13 20l5 5 9-10" />
              </svg>
            </span>
            <span className="flex flex-col">
              <span className="text-caption text-chu-mo">Vừa nhận</span>
              <span className="text-h4 text-chu">Chứng chỉ Nhập môn</span>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

const CHU_MARQUEE = "Học ✦ Thực hành ✦ Sáng tạo ✦ Tỏa sáng ✦ Tư vấn size S–3XL ✦ Phối khăn lụa ✦ Video ngắn ✦ Chăm sóc khách hàng ✦";

function Marquee() {
  return (
    <div className="overflow-hidden border-b border-chinh/10 bg-chinh-nhat text-chinh-dam">
      <div className="tk-marquee flex w-max whitespace-nowrap py-3 text-h2 font-medium">
        <span className="pr-12">{CHU_MARQUEE}</span>
        <span className="pr-12" aria-hidden>
          {CHU_MARQUEE}
        </span>
      </div>
    </div>
  );
}

interface TheLoTrinh {
  no: string;
  title: string;
  desc: string;
  tags: string[];
  lessons: string;
  href: string;
  /** The dau (Nhap mon — bat buoc cho moi vai tro) nen `chinh-nhat` de noi bat */
  noiBat?: boolean;
}

const THE_LO_TRINH: TheLoTrinh[] = [
  { no: "01", title: "Nhập môn LYNO & Thiên Khuê", desc: "Bắt buộc cho mọi vai trò: thương hiệu, sản phẩm, khách hàng, chính sách.", tags: ["Thương hiệu", "Sản phẩm", "Chính sách"], lessons: "5 bài · có bài kiểm tra", href: linkLoTrinh("sale"), noiBat: true },
  { no: "02", title: "Sale / CSKH", desc: "Tư vấn size S–3XL, phối đồ theo dịp, chăm sóc sau bán.", tags: ["Tư vấn size", "Chốt đơn", "Khiếu nại"], lessons: "5 bài học", href: linkLoTrinh("sale") },
  { no: "03", title: "CTV online", desc: "Bán hàng trên kênh cá nhân, gửi đơn và theo dõi hoa hồng.", tags: ["Đăng bài", "Inbox", "Hoa hồng"], lessons: "4 bài học", href: linkLoTrinh("ctv") },
  { no: "04", title: "KOL / KOC", desc: "Brief thương hiệu, review sản phẩm, video ngắn TikTok/Reels.", tags: ["Giọng văn", "Review", "Video ngắn"], lessons: "5 bài học", href: linkLoTrinh("kol") }
];

function LoTrinhHoc() {
  return (
    <section className="tk-reveal mx-auto flex max-w-tk flex-col gap-8 px-4 pt-16 md:px-10 md:pt-24">
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end md:gap-10">
        <div className="flex flex-col gap-2">
          <span className={lopKicker}>Lộ trình học</span>
          <h2 className={LOP_H2}>Chọn vai trò, bắt đầu ngay</h2>
        </div>
        <p className="m-0 max-w-[380px] text-body text-chu-phu">Mọi người bắt đầu từ Nhập môn, sau đó đi sâu vào lộ trình của mình.</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {THE_LO_TRINH.map(c => (
          <article
            key={c.no}
            className={`tk-lift flex flex-col gap-3 rounded-xl border p-5 ${c.noiBat ? "border-chinh/20 bg-chinh-nhat" : "border-vien bg-be-mat"}`}
          >
            <span className={`so flex h-10 w-10 items-center justify-center rounded-lg text-h4 ${c.noiBat ? "bg-chinh text-tren-chinh" : "bg-chinh-nhat text-chinh-dam"}`}>
              {c.no}
            </span>
            <h3 className="m-0 text-h3 text-chu">{c.title}</h3>
            <p className="m-0 text-body text-chu-phu">{c.desc}</p>
            <div className="flex flex-wrap gap-1.5">
              {c.tags.map(tg => (
                <span key={tg} className={`${lopChip} ${c.noiBat ? "bg-be-mat text-chu-phu" : lopChipTong["trung-tinh"]}`}>
                  {tg}
                </span>
              ))}
            </div>
            <div className="mt-auto flex items-center justify-between gap-2 border-t border-vien pt-3">
              <span className="text-caption text-chu-mo">{c.lessons}</span>
              <Link href={c.href} className={`inline-flex min-h-11 items-center text-sm ${lopLienKet}`}>
                Xem lộ trình →
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

const BUOC = [
  { no: "01", ten: "Học online", mo: "Video ngắn, bài đọc gọn, học mọi lúc trên điện thoại.", icon: <><rect x="3" y="5" width="18" height="12" rx="2" /><path d="M10 9l4 2-4 2z" /><path d="M8 21h8" /></> },
  { no: "02", ten: "Thực hành với sản phẩm thật", mo: "Chạm chất liệu, thử form dáng, phối khăn tại cửa hàng 140A Lê Văn Sỹ.", icon: <path d="M8 3l-5 4 3 3 2-1v12h8V9l2 1 3-3-5-4a4 4 0 0 1-8 0z" /> },
  { no: "03", ten: "Kiểm tra & nhận chứng chỉ", mo: "Bài kiểm tra ngắn cuối khóa, đạt là mở khóa vai trò.", icon: <><circle cx="12" cy="9" r="6" /><path d="M9 14l-2 7 5-3 5 3-2-7" /></> },
  { no: "04", ten: "Làm việc & tỏa sáng", mo: "Nhận không gian làm việc riêng theo vai trò trên LynoOS.", icon: <path d="M12 3l2.5 5.5L20 11l-5.5 2.5L12 19l-2.5-5.5L4 11l5.5-2.5z" /> }
];

function CachHoc() {
  return (
    <section className="tk-reveal mx-auto flex max-w-tk flex-col gap-10 px-4 pt-16 md:px-10 md:pt-24">
      <div className="flex flex-col items-center gap-2 text-center">
        <span className={lopKicker}>Cách học</span>
        <h2 className={LOP_H2}>Từ bài học đến công việc thật</h2>
      </div>
      <div className="relative">
        <svg viewBox="0 0 1240 60" width="100%" height="60" preserveAspectRatio="none" aria-hidden className="absolute left-0 top-[2px] hidden text-vien-dam lg:block">
          <path d="M60 30 C 200 -10, 300 70, 450 30 S 700 -10, 800 30 S 1050 70, 1180 30" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="6 8" />
        </svg>
        <div className="relative grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-7">
          {BUOC.map(b => (
            <div key={b.no} className="flex flex-col items-start gap-3">
              <span className="flex h-16 w-16 items-center justify-center rounded-full border border-chinh/15 bg-chinh-nhat text-chinh">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  {b.icon}
                </svg>
              </span>
              <span className={lopKicker}>Bước {b.no}</span>
              <h3 className="m-0 text-h3 text-chu">{b.ten}</h3>
              <p className="m-0 text-body text-chu-phu">{b.mo}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const BAI_DU_THI = [
  { nhan: "Đi làm", o: "" },
  { nhan: "Gặp đối tác", o: "mt-14" },
  { nhan: "Dạo phố", o: "" }
];

function GocSangTao() {
  return (
    <section className="tk-reveal relative mt-16 overflow-hidden bg-xanh-800 text-tren-chinh md:mt-24">
      <div className="relative mx-auto grid max-w-tk grid-cols-1 items-start gap-10 px-4 pb-20 pt-14 md:gap-16 md:px-10 md:pb-24 md:pt-20 lg:grid-cols-[minmax(0,4fr)_minmax(0,7fr)]">
        <div className="flex flex-col gap-5">
          <span className={`self-start ${LOP_CHIP_TOI}`}>Thử thách sáng tạo tuần này</span>
          <h2 className="m-0 text-h1 text-tren-chinh md:text-hien-thi">
            Một chiếc khăn,
            <br />
            <span className="text-xanh-200">ba cách thắt.</span>
          </h2>
          <p className="m-0 text-body-lg text-muc-200">
            Quay video ngắn phối một khăn lụa Thiên Khuê theo ba phong cách: đi làm, gặp đối tác, dạo phố. Bài nổi bật được giới thiệu trên kênh của LYNO.
          </p>
          <div className="flex flex-col gap-2 text-body text-muc-200">
            <span>✦ Hạn nộp: [Ngày]</span>
            <span>✦ Phần thưởng: [cần xác nhận]</span>
          </div>
          <NutLienKet href="/hoc-vien" kieu="bo" co="lon" className="self-start">
            Tham gia thử thách
          </NutLienKet>
        </div>
        <div className="grid grid-cols-3 gap-2 md:gap-4">
          {BAI_DU_THI.map(b => (
            <div key={b.nhan} className={`flex h-[220px] flex-col justify-between rounded-xl border border-xanh-700 bg-xanh-900/40 p-2.5 text-caption text-muc-200 md:h-[300px] md:p-3.5 ${b.o}`}>
              <span className={`self-start ${LOP_CHIP_TOI}`}>{b.nhan}</span>
              <span>[Bài dự thi học viên]</span>
            </div>
          ))}
          <div className="col-span-3 flex flex-col justify-between gap-2 rounded-xl border border-xanh-600 px-5 py-4 text-body text-muc-200 sm:flex-row sm:items-center sm:gap-4">
            <span>
              Thử thách tiếp theo: <strong className="font-semibold text-tren-chinh">Viết caption giới thiệu sơ mi basic cho khách size lớn</strong>
            </span>
            <span className="shrink-0 text-xanh-200">[Ngày mở]</span>
          </div>
        </div>
      </div>
    </section>
  );
}

const LICH: { ten: string; mo: string; loTrinh: LoTrinhDangKy }[] = [
  { ten: "Khai giảng CTV online", mo: "Online · 4 bài học · có mentor theo dõi", loTrinh: "ctv" },
  { ten: "Workshop phối khăn lụa", mo: "Tại cửa hàng 140A Lê Văn Sỹ · thực hành trực tiếp", loTrinh: "sale" },
  { ten: "Buổi brief KOL/KOC", mo: "Giọng văn thương hiệu · kịch bản video ngắn", loTrinh: "kol" }
];

function LichHoc() {
  return (
    <section className="tk-reveal mx-auto grid max-w-tk grid-cols-1 items-start gap-6 px-4 pt-16 md:gap-14 md:px-10 md:pt-24 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)]">
      <div className="flex flex-col gap-2">
        <span className={lopKicker}>Lịch sắp tới</span>
        <h2 className={LOP_H2}>Khai giảng &amp; workshop</h2>
      </div>
      <div className={lopKhungDs}>
        {LICH.map(l => (
          <div key={l.ten} className="grid grid-cols-[56px_minmax(0,1fr)] items-center gap-4 p-4 sm:grid-cols-[64px_minmax(0,1fr)_auto] sm:gap-5">
            <span className="flex h-14 items-center justify-center rounded-lg bg-chinh-nhat text-h4 text-chinh-dam sm:h-16">[Ngày]</span>
            <span className="flex flex-col gap-1">
              <span className="text-h3 text-chu">{l.ten}</span>
              <span className="text-body text-chu-phu">{l.mo}</span>
            </span>
            <Link href={linkLoTrinh(l.loTrinh)} className={`col-span-2 ${lopNutPhu} sm:col-span-1`}>
              Giữ chỗ
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}

export function TrangDaoTao({ loTrinh }: { loTrinh: LoTrinhDangKy }) {
  return (
    <>
      <Hero />
      <Marquee />
      <LoTrinhHoc />
      <CachHoc />
      <GocSangTao />
      <LichHoc />
      <DangKyLoTrinh key={loTrinh} loTrinhDau={loTrinh} />
    </>
  );
}
