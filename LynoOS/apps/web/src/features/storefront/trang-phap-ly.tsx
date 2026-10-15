/** Khung trang phap ly (dieu khoan, bao mat): tieu de + ngay cap nhat + cac muc; ban tieng Anh o cuoi cho ben duyet ung dung (TikTok, Meta). */
export type MucPhapLy = { tieuDe: string; doan: (string | string[])[] };

export function TrangPhapLy({ tieuDe, capNhat, muc, banAnh }: { tieuDe: string; capNhat: string; muc: MucPhapLy[]; banAnh: { tieuDe: string; muc: MucPhapLy[] } }) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-12 text-body-lg text-chu-phu md:px-10">
      <h1 className="text-hien-thi text-chu">{tieuDe}</h1>
      <p className="mt-2 text-caption text-chu-mo">Cập nhật: {capNhat}</p>
      <CacMuc muc={muc} />
      <hr className="my-12 border-vien" />
      <section lang="en">
        <h2 className="text-so text-chu">{banAnh.tieuDe}</h2>
        <p className="mt-2 text-caption text-chu-mo">Last updated: {capNhat}</p>
        <CacMuc muc={banAnh.muc} />
      </section>
    </article>
  );
}

function CacMuc({ muc }: { muc: MucPhapLy[] }) {
  return (
    <>
      {muc.map(m => (
        <section key={m.tieuDe} className="mt-8">
          <h2 className="text-h2 text-chu">{m.tieuDe}</h2>
          {m.doan.map((d, i) =>
            Array.isArray(d) ? (
              <ul key={i} className="mt-3 list-disc space-y-1 pl-6">
                {d.map(x => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            ) : (
              <p key={i} className="mt-3 leading-7">
                {d}
              </p>
            )
          )}
        </section>
      ))}
    </>
  );
}

export const CONG_TY = "Công ty Cổ phần Sản xuất và Xuất nhập khẩu HNC (ĐKKD: 0315025015, Sở KH&ĐT TP.HCM cấp ngày 04/05/2018)";
export const LIEN_HE = "Zalo/Hotline 0968 463 986 (9h–22h) · 140A Lê Văn Sỹ, P.10, Q.Phú Nhuận, TP.HCM";
export const LIEN_HE_EN = "Zalo/Hotline +84 968 463 986 (9am–10pm) · 140A Le Van Sy, Ward 10, Phu Nhuan District, Ho Chi Minh City, Vietnam";
