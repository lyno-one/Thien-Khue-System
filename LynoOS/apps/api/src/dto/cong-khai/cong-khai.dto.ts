import { Transform, Type } from "class-transformer";
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
  ValidatorConstraint,
  type ValidatorConstraintInterface,
  Validate
} from "class-validator";
import type { GuiLienHeBody, LoTrinhDangKy, SapXepSanPham, TrangLienHe } from "@thien-khue/contracts";
import { chuanHoaSdt } from "../../infrastructure/crm/chuan-hoa-sdt";

/*
 * DTO route cong khai. Chuoi rong tu form -> undefined (IsOptional chi bo qua null / undefined).
 * Hang so khai bao lai o day vi API chi `import type` tu contracts.
 */

export const TRANG_LIEN_HE: readonly TrangLienHe[] = ["TRANG_CHU", "VIP", "THAN_THIEN", "DOI_TAC", "DAO_TAO", "SAN_PHAM"];
export const LO_TRINH: readonly LoTrinhDangKy[] = ["sale", "ctv", "kol", "other"];
export const SAP_XEP: readonly SapXepSanPham[] = ["moi", "ma"];

/** SDT Viet Nam sau chuan hoa: 10 so, dau 0 + dau so di dong (3,5,7,8,9) hoac co dinh (2) */
export function laSdtVietNam(sdt: string | null | undefined): boolean {
  return /^0[235789]\d{8}$/.test(chuanHoaSdt(sdt));
}

@ValidatorConstraint({ name: "sdtVietNam", async: false })
class SdtVietNamRule implements ValidatorConstraintInterface {
  validate(v: unknown) {
    return typeof v === "string" && laSdtVietNam(v);
  }
  defaultMessage() {
    return "Số điện thoại không hợp lệ (cần số Việt Nam 10 chữ số, ví dụ 0912 345 678)";
  }
}

const catChuoi = ({ value }: { value: unknown }) => {
  if (typeof value !== "string") return value;
  const v = value.trim();
  return v === "" ? undefined : v;
};

export class DanhSachSanPhamQueryDto {
  @IsOptional()
  @Transform(catChuoi)
  @IsString()
  @MaxLength(60, { message: "Từ khoá tối đa 60 ký tự" })
  tu_khoa?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "gioi_han phải là số nguyên" })
  @Min(1)
  @Max(48, { message: "gioi_han tối đa 48" })
  gioi_han?: number;

  @IsOptional()
  @IsIn(SAP_XEP as SapXepSanPham[], { message: "sap_xep chỉ nhận moi | ma" })
  sap_xep?: SapXepSanPham;
}

export class GuiLienHeDto implements GuiLienHeBody {
  @Transform(catChuoi)
  @IsString({ message: "Vui lòng nhập họ và tên" })
  @MinLength(2, { message: "Họ và tên quá ngắn" })
  @MaxLength(100, { message: "Họ và tên tối đa 100 ký tự" })
  ho_ten!: string;

  @Transform(catChuoi)
  @IsString({ message: "Vui lòng nhập số điện thoại" })
  @MaxLength(20, { message: "Số điện thoại không hợp lệ" })
  @Validate(SdtVietNamRule)
  sdt!: string;

  @IsOptional()
  @Transform(catChuoi)
  @IsEmail({}, { message: "Email không hợp lệ" })
  @MaxLength(150)
  email?: string;

  @IsIn(TRANG_LIEN_HE as TrangLienHe[], { message: "Trang đăng ký không hợp lệ" })
  trang!: TrangLienHe;

  // Trang Dao tao bat buoc chon lo trinh; trang khac bo qua neu khong gui
  @ValidateIf((o: GuiLienHeDto) => o.trang === "DAO_TAO" || o.lo_trinh !== undefined)
  @IsIn(LO_TRINH as LoTrinhDangKy[], { message: "Vui lòng chọn lộ trình" })
  lo_trinh?: LoTrinhDangKy;

  @IsOptional()
  @Transform(catChuoi)
  @IsString()
  @MaxLength(100, { message: "Lựa chọn tối đa 100 ký tự" })
  lua_chon?: string;

  @IsOptional()
  @Transform(catChuoi)
  @IsString()
  @MaxLength(1000, { message: "Lời nhắn tối đa 1000 ký tự" })
  loi_nhan?: string;

  @IsOptional()
  @Transform(catChuoi)
  @Matches(/^[A-Za-z0-9_-]{1,30}$/, { message: "Mã sản phẩm không hợp lệ" })
  ma_mau_quan_tam?: string;

  @IsOptional()
  @Transform(catChuoi)
  @Matches(/^[A-Za-z0-9_-]{1,40}$/, { message: "Mã giới thiệu không hợp lệ" })
  ma_gioi_thieu?: string;

  @IsOptional()
  @IsBoolean()
  dong_y_lien_he?: boolean;

  /** Honeypot — khong trim / validate noi dung: co gia tri la bot */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  website?: string;
}
