import Image from "next/image";
import Link from "next/link";
import type { SanPhamCongKhai } from "@thien-khue/contracts";
import { lopChip, lopChipTong, lopKicker, lopKhungDs, lopLienKet, NutLienKet } from "@/components/ui";
import { linkLoTrinh, LYNO } from "./noi-dung";
import { TheSanPham, TheSanPhamCho } from "./the-san-pham";

/*
 * Trang chu thuong mai — Main.dc.html (desktop, nhanh isHome) + Mobile.dc.html (390px) gop thanh MOT trang responsive.
 * Khoi chi co o mot ban thiet ke thi an / hien theo md: (Mobile: danh muc cuon ngang, "Cùng LynoOS";
 * Desktop: dai thong tin, hoat dong noi bat, teaser hoc vien, vai tro).
 * Mau theo he trang xanh CRM (DESIGN.md): nen trang, khoi nhan `chinh-nhat`, mot khoi toi phang `xanh-800`,
 * xanh `chinh` chi o cho bam duoc / dang chon; khong gradient, khong vang / cam / tim.
 */

const LOP_H2 = "m-0 text-h1 text-chu";
/** Chip noi bat tren nen xanh dam */
const LOP_CHIP_TOI = `${lopChip} bg-xanh-100 text-xanh-800`;

function LinkNgoai({ className, children, ...con }: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a href={LYNO} target="_blank" rel="noopener noreferrer" className={className} {...con}>
      {children}
    </a>
  );
}

function DauMuc({ kicker, tieuDe, id, kickerChiDesktop }: { kicker: string; tieuDe: string; id?: string; kickerChiDesktop?: boolean }) {
  return (
    <div className="flex flex-col gap-2">
      <span className={`${lopKicker} ${kickerChiDesktop ? "hidden md:inline" : ""}`}>{kicker}</span>
      <h2 id={id} className={LOP_H2}>
        {tieuDe}
      </h2>
    </div>
  );
}

// ------------------------------------------------------------------ HERO

function Hero() {
  return (
    <section className="relative h-[620px] overflow-hidden border-b border-vien bg-be-mat md:h-[680px]">
      {/* Mobile: anh chiem 72% duoi; desktop: phu kin */}
      <div className="absolute inset-x-0 bottom-0 h-[72%] md:inset-0 md:h-full">
        <Image
          src="/hero-nen-trang.jpg"
          alt="Người mẫu mặc áo khoác trắng trên nền trắng"
          fill
          priority
          sizes="100vw"
          className="object-cover object-[92%_bottom] md:object-[right_bottom]"
        />
      </div>
      <div className="absolute inset-x-4 top-8 md:inset-0 md:flex md:items-center">
        <div className="mx-auto flex w-full max-w-tk flex-col gap-4 text-chu md:gap-6 md:px-10">
          <span className={`tk-up self-start ${lopChip} ${lopChipTong.chinh}`}>
            <span className="md:hidden">BST [Tên] · [Mùa]</span>
            <span className="hidden md:inline">Bộ sưu tập [Tên BST] · [Mùa / Năm]</span>
          </span>
          <h1 className="tk-up tk-d1 m-0 max-w-[560px] text-hien-thi">
            Khí chất <br className="hidden md:block" />
            <span className="text-chinh">không cần lên tiếng.</span>
          </h1>
          <p className="tk-up tk-d2 m-0 hidden max-w-[440px] text-body-lg text-chu-phu md:block">
            Thời trang công sở LYNO và khăn lụa Thiên Khuê — cổ điển mà hiện đại, tinh tế mà phóng khoáng.
          </p>
          <div className="tk-up tk-d3 flex gap-3 md:pt-2">
            <NutLienKet href={LYNO} co="lon">
              Mua bộ sưu tập
            </NutLienKet>
            <NutLienKet href={LYNO} co="lon" kieu="vien" className="hidden md:inline-flex">
              Khăn lụa Thiên Khuê
            </NutLienKet>
          </div>
        </div>
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ DANH MUC (mobile)

const DANH_MUC_MOBILE: { nhan: string; noiBat?: boolean }[] = [
  { nhan: "Sơ mi" },
  { nhan: "Áo kiểu" },
  { nhan: "Đầm" },
  { nhan: "Blazer" },
  { nhan: "Khăn lụa", noiBat: true }
];

function DanhMucMobile() {
  return (
    <nav aria-label="Danh mục" className="cuon-mong flex gap-2 overflow-x-auto border-b border-vien px-4 py-4 md:hidden">
      {DANH_MUC_MOBILE.map(d => (
        <LinkNgoai
          key={d.nhan}
          className={`inline-flex min-h-10 shrink-0 items-center rounded-lg border px-4 text-sm font-medium no-underline ${
            d.noiBat ? "border-chinh/20 bg-chinh-nhat text-chinh-dam" : "border-vien-dam bg-be-mat text-chu"
          }`}
        >
          {d.nhan}
        </LinkNgoai>
      ))}
    </nav>
  );
}

// ------------------------------------------------------------------ DAI THONG TIN (desktop)

const THONG_TIN = [
  { so: "Từ 2018", chu: "8 năm đồng hành cùng phụ nữ công sở" },
  { so: "S — 3XL", chu: "Vừa vặn cho mọi vóc dáng" },
  { so: "Đồng kiểm", chu: "Xem hàng trước khi thanh toán" },
  { so: "140A Lê Văn Sỹ", chu: "Cửa hàng Phú Nhuận, TP.HCM" }
];

function DaiThongTin() {
  return (
    <section className="tk-reveal hidden border-b border-vien bg-nen md:block">
      <div className="mx-auto grid max-w-tk grid-cols-2 px-10 lg:grid-cols-4">
        {THONG_TIN.map((t, i) => (
          <div
            key={t.so}
            className={`flex flex-col gap-1 py-6 ${i === 0 ? "pr-6" : i === 3 ? "pl-6" : "px-6"} ${i < 3 ? "lg:border-r lg:border-vien" : ""}`}
          >
            <span className="text-h1 text-chu">{t.so}</span>
            <span className="text-body text-chu-phu">{t.chu}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ HOAT DONG NOI BAT (desktop)

const HOAT_DONG = [
  { anh: "bo-suu-tap", alt: "Bộ sưu tập thời trang LYNO", muc: "Bộ sưu tập", ten: "Khám phá bộ sưu tập LYNO", mo: "Xem trước tại cửa hàng Phú Nhuận, thành viên VIP được ưu tiên đặt giữ mẫu." },
  { anh: "khan-1", alt: "Họa tiết khăn lụa Thiên Khuê", muc: "Phong cách", ten: "Phối khăn lụa cho trang phục công sở", mo: "Khám phá cách phối khăn cùng sơ mi và blazer cho những cuộc gặp quan trọng." },
  { anh: "cua-hang", alt: "Không gian cửa hàng LYNO", muc: "Đào tạo", ten: "Học nghề cùng sản phẩm thật", mo: "Lộ trình về sản phẩm, tư vấn size và chốt đơn cho người mới bắt đầu." }
];

function HoatDongNoiBat() {
  return (
    <section className="tk-reveal mx-auto hidden max-w-tk flex-col gap-8 px-10 pt-20 md:flex">
      <div className="border-b border-vien pb-4">
        <DauMuc kicker="Hoạt động nổi bật" tieuDe="Sự kiện & câu chuyện" />
      </div>
      <div className="grid grid-cols-3 gap-6">
        {HOAT_DONG.map(h => (
          <article key={h.ten} className="flex flex-col gap-3">
            <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-vien bg-be-mat-phu"><Image src={`/images/lyno/${h.anh}.jpg`} alt={h.alt} fill sizes="(min-width: 768px) 33vw, 100vw" className="object-cover" /></div>
            <span className="text-caption text-chu-mo">{h.muc}</span>
            <h3 className="m-0 text-h3 text-chu">{h.ten}</h3>
            <p className="m-0 text-body text-chu-phu">{h.mo}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ MOI VE (du lieu that CRM)

function MoiVe({ sanPham }: { sanPham: SanPhamCongKhai[] | null }) {
  const coDuLieu = !!sanPham?.length;
  return (
    <section className="tk-reveal mx-auto flex w-full max-w-tk flex-col gap-5 px-4 pt-14 md:gap-8 md:px-10 md:pt-20" aria-labelledby="moi-ve">
      <div className="flex items-end justify-between gap-4 border-b border-vien pb-4">
        <DauMuc kicker="Mua sắm" tieuDe="Mới về" id="moi-ve" kickerChiDesktop />
        <div className="flex items-center gap-5 text-sm">
          {coDuLieu && (
            <Link href="/san-pham" className={`inline-flex min-h-11 items-center ${lopLienKet}`}>
              Tất cả mẫu
            </Link>
          )}
          <LinkNgoai className={`hidden min-h-11 items-center md:inline-flex ${lopLienKet}`}>Xem tất cả tại lyno.vn</LinkNgoai>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-6 md:gap-6 lg:grid-cols-4">
        {coDuLieu ? sanPham!.map(sp => <TheSanPham key={sp.ma} sp={sp} />) : <TheSanPhamCho />}
      </div>
      <div className="hidden justify-center pt-2 md:flex">
        <NutLienKet href={LYNO} co="lon" kieu="vien">
          Xem thêm tại LYNO
        </NutLienKet>
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ HAI DONG

function HaiDong() {
  return (
    <section className="tk-reveal mx-auto grid w-full max-w-tk grid-cols-1 gap-8 px-4 pt-10 md:grid-cols-2 md:gap-6 md:px-10 md:pt-20">
      <LinkNgoai className="group flex flex-col gap-3 text-chu no-underline">
        <div className="relative h-[420px] overflow-hidden rounded-xl border border-vien bg-be-mat-phu md:h-[520px]">
          <Image src="/images/lyno/so-mi.jpg" alt="Sơ mi trắng công sở LYNO" fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover object-top transition-transform duration-500 group-hover:scale-105" />
        </div>
        <span className={lopKicker}>Dòng cơ bản · Size S — 3XL</span>
        <span className="text-h2 transition-colors duration-nhanh group-hover:text-chinh md:text-h1">Dễ mặc, dễ phối, không lỗi mốt</span>
      </LinkNgoai>
      <LinkNgoai className="group flex flex-col gap-3 text-chu no-underline md:pt-16">
        <div className="relative h-[420px] overflow-hidden rounded-xl border border-chinh/10 bg-chinh-nhat md:h-[520px]">
          <Image src="/images/lyno/hoa-tiet.jpg" alt="Sơ mi họa tiết LYNO" fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover object-top transition-transform duration-500 group-hover:scale-105" />
        </div>
        <span className={lopKicker}>Họa tiết · Áo kiểu · Đầm</span>
        <span className="text-h2 transition-colors duration-nhanh group-hover:text-chinh md:text-h1">Điểm nhấn cho những cuộc gặp quan trọng</span>
      </LinkNgoai>
    </section>
  );
}

// ------------------------------------------------------------------ KHAN LUA THIEN KHUE

/** Dai hoa van lua — net theo mau chu (currentColor) cua phan tu boc */
export function DaiHoaVanLua({ id, co = 56 }: { id: string; co?: number }) {
  const g = co / 2;
  return (
    <svg width="100%" height={co} aria-hidden className="block">
      <defs>
        <pattern id={id} width={co} height={co} patternUnits="userSpaceOnUse">
          <path d={`M${g} ${co * 0.09} L${co * 0.91} ${g} L${g} ${co * 0.91} L${co * 0.09} ${g} Z`} fill="none" stroke="currentColor" strokeWidth="0.8" />
          <path d={`M${g} ${co * 0.3} L${co * 0.7} ${g} L${g} ${co * 0.7} L${co * 0.3} ${g} Z`} fill="none" stroke="currentColor" strokeWidth="0.8" />
          <circle cx={g} cy={g} r="1.5" fill="currentColor" />
        </pattern>
      </defs>
      <rect width="100%" height={co} fill={`url(#${id})`} />
    </svg>
  );
}

function KhuThienKhue() {
  return (
    <section className="tk-reveal mt-14 border-y border-chinh/10 bg-chinh-nhat text-chu md:mt-20">
      <div className="text-xanh-200 md:hidden">
        <DaiHoaVanLua id="silkM" co={40} />
      </div>
      <div className="hidden text-xanh-200 md:block">
        <DaiHoaVanLua id="silkTop" co={56} />
      </div>
      <div className="mx-auto grid max-w-tk grid-cols-1 items-center gap-4 px-4 pb-14 pt-10 md:gap-16 md:px-10 md:pb-20 md:pt-14 lg:grid-cols-[minmax(0,4fr)_minmax(0,7fr)]">
        {/* Mobile: display:contents de gia + nut xuong duoi anh (Mobile.dc.html); md+: mot cot chu */}
        <div className="contents md:flex md:flex-col md:gap-5">
          <span className={lopKicker}>Khăn lụa Thiên Khuê</span>
          <h2 className="m-0 text-h1 text-chu md:text-hien-thi">
            Nét hoàn thiện
            <br />
            bằng lụa.
          </h2>
          <p className="m-0 hidden text-body-lg text-chu-phu md:block">
            Buộc cổ cùng sơ mi, cài trên túi xách hay quấn tóc — một dải lụa đủ để trang phục công sở trở nên của riêng bạn.
          </p>
          <div className="so order-last text-h2 text-chu md:order-none">350.000đ — 546.000đ</div>
          <NutLienKet href={LYNO} co="lon" className="order-last md:order-none md:self-start">
            <span className="md:hidden">Xem khăn lụa</span>
            <span className="hidden md:inline">Mua khăn lụa</span>
          </NutLienKet>
        </div>
        <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-3">
          <div className="relative h-[260px] overflow-hidden rounded-xl border border-chinh/10 bg-be-mat md:h-[420px]"><Image src="/images/lyno/khan-1.jpg" alt="Khăn lụa Thiên Khuê họa tiết vàng" fill sizes="(min-width: 1024px) 22vw, 50vw" className="object-cover" /></div>
          <div className="relative mt-7 h-[260px] overflow-hidden rounded-xl border border-chinh/10 bg-be-mat md:mt-12 md:h-[420px]">
            <Image src="/images/lyno/khan-2.jpg" alt="Khăn lụa Thiên Khuê họa tiết mềm mại" fill sizes="(min-width: 1024px) 22vw, 50vw" className="object-cover" />
          </div>
          <div className="relative hidden h-[420px] overflow-hidden rounded-xl border border-chinh/10 bg-be-mat lg:block"><Image src="/images/lyno/khan-lua.jpg" alt="Gợi ý phối khăn lụa Thiên Khuê" fill sizes="22vw" className="object-cover object-top" /></div>
        </div>
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ TEASER HOC VIEN (desktop)

const THE_LO_TRINH = [
  { so: "01", ten: "Nhập môn", href: "/dao-tao" },
  { so: "02", ten: "Sale / CSKH", href: linkLoTrinh("sale") },
  { so: "03", ten: "CTV online", href: linkLoTrinh("ctv") },
  { so: "04", ten: "KOL / KOC", href: linkLoTrinh("kol") }
];

function TeaserHocVien() {
  return (
    <section className="tk-reveal mx-auto hidden max-w-tk px-10 pt-20 md:block">
      <div className="grid grid-cols-1 items-center gap-10 rounded-xl bg-xanh-800 p-10 text-tren-chinh lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:p-12">
        <div className="flex flex-col gap-4">
          <span className={`self-start ${LOP_CHIP_TOI}`}>Đào tạo · Học viện LynoOS</span>
          <h2 className="m-0 text-hien-thi text-tren-chinh">
            Yêu thời trang?
            <br />
            <span className="text-xanh-200">Học để làm nghề.</span>
          </h2>
          <p className="m-0 max-w-[520px] text-body-lg text-muc-200">
            Lộ trình Sale/CSKH, CTV online, KOL/KOC — học online, thực hành với sản phẩm thật và nhận chứng chỉ để bắt đầu làm việc.
          </p>
          <div className="flex gap-3 pt-1">
            <NutLienKet href="/dao-tao" kieu="bo" co="lon">
              Xem lộ trình
            </NutLienKet>
            <NutLienKet href="/hoc-vien" kieu="vien-toi" co="lon">
              Học thử miễn phí
            </NutLienKet>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {THE_LO_TRINH.map(t => (
            <Link
              key={t.so}
              href={t.href}
              className="flex min-h-24 flex-col gap-1 rounded-xl border border-xanh-700 bg-xanh-900/40 p-4 text-left text-tren-chinh no-underline transition-colors duration-nhanh hover:border-xanh-400 hover:bg-xanh-700 hover:text-tren-chinh"
            >
              <span className="so text-h2 text-xanh-200">{t.so}</span>
              <span className="text-h4">{t.ten}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ VAI TRO (desktop) / CUNG THIEN KHUE S (mobile)

const VAI_TRO = [
  { muc: "Khách hàng", ten: "Khách hàng VIP", mo: "Tư vấn riêng, xem trước bộ sưu tập", href: "/vip" },
  { muc: "Cộng đồng", ten: "Khách hàng thân thiện", mo: "Tích điểm, gợi ý phối đồ, giới thiệu bạn bè", href: "/than-thien" },
  { muc: "Đối tác", ten: "Hạnh phúc CEO / Đối tác", mo: "Đồng phục, quà tặng khăn lụa, phân phối", href: "/doi-tac" }
];

function VaiTroDesktop() {
  return (
    <section className="tk-reveal mx-auto hidden max-w-tk grid-cols-3 gap-4 px-10 pb-24 pt-20 md:grid">
      {VAI_TRO.map(v => (
        <Link
          key={v.href}
          href={v.href}
          className="tk-lift group flex min-h-40 flex-col gap-2 rounded-xl border border-vien bg-be-mat p-6 text-chu no-underline hover:text-chu"
        >
          <span className={lopKicker}>{v.muc}</span>
          <span className="text-h2 transition-colors duration-nhanh group-hover:text-chinh">
            {v.ten} <span aria-hidden>→</span>
          </span>
          <span className="text-body text-chu-phu">{v.mo}</span>
        </Link>
      ))}
    </section>
  );
}

const CUNG_TK = [
  { ten: "Khách hàng VIP", href: "/vip" },
  { ten: "Thân thiện", href: "/than-thien" },
  { ten: "Hạnh phúc CEO / Đối tác", href: "/doi-tac" },
  { ten: "Đào tạo", href: "/dao-tao" }
];

function CungThienKhueMobile() {
  return (
    <section className="tk-reveal flex flex-col gap-4 px-4 py-14 md:hidden">
      <DauMuc kicker="Cùng LynoOS" tieuDe="Hơn cả mua sắm" />
      <nav aria-label="Cùng LynoOS" className={lopKhungDs}>
        {CUNG_TK.map(c => (
          <Link
            key={c.href}
            href={c.href}
            className="flex min-h-14 items-center justify-between px-4 text-body-lg font-medium text-chu no-underline transition-colors duration-nhanh hover:bg-be-mat-phu"
          >
            {c.ten} <span aria-hidden className="text-chu-mo">→</span>
          </Link>
        ))}
      </nav>
      <Link href="/hoc-vien" className="flex flex-col gap-2 rounded-xl bg-xanh-800 p-5 text-tren-chinh no-underline hover:text-tren-chinh">
        <span className={`self-start ${LOP_CHIP_TOI}`}>Học viện LynoOS</span>
        <span className="text-h1">
          Yêu thời trang? <span className="text-xanh-200">Học để làm nghề.</span>
        </span>
        <span className="text-sm font-semibold text-muc-200">Học thử miễn phí →</span>
      </Link>
    </section>
  );
}

// ------------------------------------------------------------------ GHEP TRANG

export function TrangChu({ sanPham }: { sanPham: SanPhamCongKhai[] | null }) {
  return (
    <>
      <Hero />
      <DanhMucMobile />
      <DaiThongTin />
      <HoatDongNoiBat />
      {/* Mobile: hai dong truoc moi ve (Mobile.dc.html); desktop: moi ve truoc (Main.dc.html) */}
      <div className="flex flex-col-reverse md:flex-col">
        <MoiVe sanPham={sanPham} />
        <HaiDong />
      </div>
      <KhuThienKhue />
      <TeaserHocVien />
      <VaiTroDesktop />
      <CungThienKhueMobile />
    </>
  );
}
