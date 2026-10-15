import type { LoTrinhDangKy, TrangLienHe } from "@thien-khue/contracts";
import { lopChip, lopChipTong, lopThe } from "@/components/ui";
import { FormLienHe } from "./form-lien-he";
import type { CauHinhForm, MucKhoi, TrangVaiTro } from "./noi-dung";

/*
 * Trang vai tro (Main.dc.html — nhanh notHome): hero kicker + khoi quyen loi + form dang ky.
 * Dung cho /vip, /than-thien, /doi-tac; trang Dao tao dung lai KhoiVaForm.
 * He trang xanh CRM: hero nen `nen`, chip `chinh-nhat`, so thu tu trong o `chinh-nhat`, form trong the trang.
 */

export function HeroVaiTro({ hero }: { hero: TrangVaiTro["hero"] }) {
  return (
    <section className="tk-reveal border-b border-vien bg-nen">
      <div className="mx-auto grid max-w-tk grid-cols-1 items-end gap-5 px-4 pb-12 pt-12 md:gap-16 md:px-10 md:pb-16 md:pt-20 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <div className="flex flex-col gap-4">
          <span className={`tk-up self-start ${lopChip} ${lopChipTong.chinh}`}>{hero.kicker}</span>
          <h1 className="tk-up tk-d1 m-0 text-h1 text-chu md:text-hien-thi">{hero.title}</h1>
        </div>
        <p className="tk-up tk-d2 m-0 max-w-[65ch] text-body-lg text-chu-phu">{hero.lead}</p>
      </div>
    </section>
  );
}

interface KhoiVaFormProps {
  block: { heading: string; items: MucKhoi[]; note: string };
  form: CauHinhForm;
  trang: TrangLienHe;
  loTrinh?: LoTrinhDangKy;
  /** Doi key de form ve trang thai dau khi doi lo trinh */
  khoaForm?: string;
}

export function KhoiVaForm({ block, form, trang, loTrinh, khoaForm }: KhoiVaFormProps) {
  return (
    <section className="tk-reveal mx-auto grid max-w-tk grid-cols-1 items-start gap-10 px-4 pb-20 pt-10 md:px-10 md:pb-24 md:pt-14 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:gap-20">
      <div className="flex flex-col">
        <h2 className="m-0 mb-4 text-h1 text-chu">{block.heading}</h2>
        {block.items.map(it => (
          <div key={it.no + it.title} className="grid grid-cols-[40px_minmax(0,1fr)] gap-4 border-t border-vien py-5">
            <span className="so flex h-10 w-10 items-center justify-center rounded-lg bg-chinh-nhat text-h4 text-chinh-dam">{it.no}</span>
            <div className="flex flex-col gap-1">
              <span className="text-h3 text-chu">{it.title}</span>
              <span className="text-body text-chu-phu">{it.text}</span>
            </div>
          </div>
        ))}
        <div className="mt-1 rounded-xl bg-be-mat-phu px-4 py-3 text-body text-chu-phu">{block.note}</div>
      </div>

      <div className={`${lopThe} p-5 md:p-8`}>
        <FormLienHe key={khoaForm} trang={trang} form={form} loTrinh={loTrinh} />
      </div>
    </section>
  );
}

export function TrangVaiTroDayDu({ du }: { du: TrangVaiTro }) {
  return (
    <>
      <HeroVaiTro hero={du.hero} />
      <KhoiVaForm block={du.block} form={du.form} trang={du.trang} />
    </>
  );
}
