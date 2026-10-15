/**
 * Chuan hoa SDT giong het CRM (apps/api/src/services/khach-hang.service.ts + cot don_hang.sdt_chuan):
 * bo ky tu khong phai so, "84..." (dai hon 9 so) -> "0...", dung 9 so -> them "0".
 * Khach CRM = khach_hang.sdt (da chuan hoa); don noi khach qua don_hang.sdt_chuan.
 */
export function chuanHoaSdt(sdt: string | null | undefined): string {
  const raw = (sdt || "").replace(/\D/g, "");
  if (raw.startsWith("84") && raw.length > 9) return "0" + raw.slice(2);
  if (raw.length === 9) return "0" + raw;
  return raw;
}

/** SDT Viet Nam hop le sau chuan hoa: 10 so, bat dau bang 0 */
export function laSdtHopLe(sdt: string | null | undefined): boolean {
  return /^0\d{9}$/.test(chuanHoaSdt(sdt));
}
