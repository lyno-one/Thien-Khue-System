import anhTheoMa from "./anh-san-pham-lyno.json";

export function anhSanPhamLyno(sp: { ten: string; ma?: string; anh_url?: string | null }) {
  const ma = sp.ma?.toUpperCase() || sp.ten.match(/\b(?:AB|AL|HI|TK|K)\d{4,6}\b/i)?.[0]?.toUpperCase();
  const anhDungMa = ma ? (anhTheoMa as Record<string, string>)[ma] : undefined;
  const ten = sp.ten.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const nhom = /khan/.test(ten) ? "khan-lua" : /blazer|vest/.test(ten) ? "blazer" : /dam|set/.test(ten) ? "dam" : /chan vay/.test(ten) ? "chan-vay" : /quan/.test(ten) ? "quan" : /hoa tiet/.test(ten) ? "hoa-tiet" : /lua/.test(ten) ? "ao-lua" : /thun|len/.test(ten) ? "ao-thun" : /kieu/.test(ten) ? "ao-kieu" : "so-mi";
  return { src: anhDungMa || `/images/lyno/${nhom}.jpg`, minhHoa: !anhDungMa };
}
