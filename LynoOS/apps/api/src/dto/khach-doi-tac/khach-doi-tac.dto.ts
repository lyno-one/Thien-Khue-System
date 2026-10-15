import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min
} from "class-validator";
import { PhanTrangQueryDto } from "../../common/utils/phan-trang";

// DTO module khach-doi-tac (ValidationPipe whitelist + forbidNonWhitelisted o core)

const HANG = ["THAN_THIET", "VIP"] as const;
type Hang = (typeof HANG)[number];
const LOAI_DOI_TAC = ["DOANH_NGHIEP", "NGAN_HANG", "TO_CHUC", "NHA_CUNG_CAP_QUA"] as const;
const LOAI_HOP_DONG = ["DAT_QUA", "DONG_THUONG_HIEU", "TAI_TRO", "KHAC"] as const;
const TRANG_THAI_HOP_DONG = ["NHAP", "HIEU_LUC", "KET_THUC", "HUY"] as const;
const TRANG_THAI_DUYET = ["CHO_THAM_DINH", "DA_DUYET", "TU_CHOI"] as const;
const TRANG_THAI_MOI = ["DA_MOI", "THAM_GIA", "TU_CHOI", "DA_GUI_MAU", "DA_PHAN_HOI", "ROI_CHUONG_TRINH"] as const;
const TRANG_THAI_CAP_PHAT = ["DA_CAP", "DA_DUNG", "HET_HAN", "HUY"] as const;

// ------------------------------------------------------------------ hang

export class CapNhatCauHinhHangDto {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(60) ten?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) nguong_tich_luy?: number;
  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(100) giam_gia_phan_tram?: number;
  @IsOptional() @IsString() @MaxLength(2000) quyen_loi?: string | null;
  @IsOptional() @IsBoolean() bat?: boolean;
}

export class TraCuuHangQuery {
  @IsString() @IsNotEmpty() sdt: string;
}

// ------------------------------------------------------------------ uu dai

export class TaoQuaTangDto {
  @IsOptional() @IsUUID() doi_tac_id?: string | null;
  @IsString() @IsNotEmpty() @MaxLength(200) ten: string;
  @IsOptional() @IsString() @MaxLength(2000) mo_ta?: string | null;
  @IsOptional() @IsString() @MaxLength(1000) hinh_anh?: string | null;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) gia_tri?: number | null;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) so_luong?: number | null;
  @IsOptional() @IsArray() @IsIn(HANG, { each: true }) hang_ap_dung?: Hang[];
}

export class ThamDinhQuaDto {
  @IsBoolean() dat: boolean;
  @IsString() @IsNotEmpty() @MaxLength(2000) ket_qua: string;
}

export class DuyetUuDaiDto {
  @IsBoolean() duyet: boolean;
  @IsOptional() @IsString() @MaxLength(1000) ly_do?: string | null;
}

export class TaoVoucherDto {
  @IsString() @Matches(/^[A-Z0-9_-]{3,40}$/, { message: "Mã voucher 3–40 ký tự: chữ in hoa, số, - hoặc _" }) ma: string;
  @IsString() @IsNotEmpty() @MaxLength(200) ten: string;
  @IsOptional() @IsUUID() doi_tac_id?: string | null;
  @IsIn(["PHAN_TRAM", "SO_TIEN"]) loai_giam: "PHAN_TRAM" | "SO_TIEN";
  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) gia_tri: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) don_toi_thieu?: number | null;
  @IsOptional() @IsArray() @IsIn(HANG, { each: true }) hang_ap_dung?: Hang[];
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) so_luong?: number | null;
  @IsOptional() @IsDateString() bat_dau?: string | null;
  @IsOptional() @IsDateString() het_han?: string | null;
}

export class LocUuDaiQuery extends PhanTrangQueryDto {
  @IsOptional() @IsIn(TRANG_THAI_DUYET) trang_thai?: (typeof TRANG_THAI_DUYET)[number];
  @IsOptional() @IsUUID() doi_tac_id?: string;
}

export class CapPhatDto {
  @IsString() @IsNotEmpty() sdt: string;
  @IsOptional() @IsUUID() voucher_id?: string | null;
  @IsOptional() @IsUUID() qua_tang_id?: string | null;
  @IsOptional() @IsString() @MaxLength(500) ly_do?: string | null;
}

export class CapPhatTheoHangDto {
  @IsIn(HANG) hang: Hang;
  @IsOptional() @IsUUID() voucher_id?: string | null;
  @IsOptional() @IsUUID() qua_tang_id?: string | null;
  @IsOptional() @IsString() @MaxLength(500) ly_do?: string | null;
}

export class CapNhatCapPhatDto {
  @IsIn(["DA_DUNG", "HUY", "HET_HAN"]) trang_thai: "DA_DUNG" | "HUY" | "HET_HAN";
  @IsOptional() @IsUUID() crm_don_id?: string | null;
}

export class LocCapPhatQuery extends PhanTrangQueryDto {
  @IsOptional() @IsString() sdt?: string;
  @IsOptional() @IsIn(TRANG_THAI_CAP_PHAT) trang_thai?: (typeof TRANG_THAI_CAP_PHAT)[number];
}

// ------------------------------------------------------------------ KH hanh phuc

export class TraLoiMoiDto {
  @IsBoolean() tham_gia: boolean;
}

export class DongYHinhDto {
  @IsBoolean() dong_y: boolean;
}

export class GuiPhanHoiDto {
  @IsOptional() @IsString() @MaxLength(40) ma_mau?: string | null;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(5) diem_size?: number | null;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(5) diem_chat_lieu?: number | null;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(5) diem_kieu_dang?: number | null;
  @IsString() @IsNotEmpty() @MaxLength(4000) noi_dung: string;
  @IsOptional() @IsArray() @ArrayMaxSize(10) @IsString({ each: true }) @MaxLength(1000, { each: true }) hinh_anh?: string[];
  @IsOptional() @IsBoolean() cho_phep_dung_hinh?: boolean;
}

export class MoiKhHanhPhucDto {
  @IsString() @IsNotEmpty() sdt: string;
  @IsOptional() @IsString() @MaxLength(1000) ghi_chu?: string | null;
}

export class CapNhatMoiKhDto {
  @IsIn(["DA_GUI_MAU", "ROI_CHUONG_TRINH"]) trang_thai: "DA_GUI_MAU" | "ROI_CHUONG_TRINH";
  @IsOptional() @IsString() @MaxLength(1000) ghi_chu?: string | null;
}

export class LocMoiKhQuery extends PhanTrangQueryDto {
  @IsOptional() @IsIn(TRANG_THAI_MOI) trang_thai?: (typeof TRANG_THAI_MOI)[number];
}

export class LocPhanHoiQuery extends PhanTrangQueryDto {
  @IsOptional() @IsString() ma_mau?: string;
  /** "true" = chi phan hoi khach cho phep dung hinh (de truyen thong) */
  @IsOptional() @IsIn(["true", "false"]) chi_duoc_dung_hinh?: "true" | "false";
}

// ------------------------------------------------------------------ doi tac

export class TaoDoiTacDto {
  @IsString() @IsNotEmpty() @MaxLength(200) ten: string;
  @IsIn(LOAI_DOI_TAC) loai: (typeof LOAI_DOI_TAC)[number];
  @IsOptional() @IsString() @MaxLength(30) ma_so_thue?: string | null;
  @IsOptional() @IsString() @MaxLength(120) nguoi_lien_he?: string | null;
  @IsOptional() @IsString() @MaxLength(20) sdt?: string | null;
  @IsOptional() @IsEmail() email?: string | null;
  @IsOptional() @IsString() @MaxLength(500) dia_chi?: string | null;
  @IsOptional() @IsUUID() ho_so_id?: string | null;
  @IsOptional() @IsString() @MaxLength(2000) ghi_chu?: string | null;
}

export class CapNhatDoiTacDto {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(200) ten?: string;
  @IsOptional() @IsIn(LOAI_DOI_TAC) loai?: (typeof LOAI_DOI_TAC)[number];
  @IsOptional() @IsString() @MaxLength(30) ma_so_thue?: string | null;
  @IsOptional() @IsString() @MaxLength(120) nguoi_lien_he?: string | null;
  @IsOptional() @IsString() @MaxLength(20) sdt?: string | null;
  @IsOptional() @IsEmail() email?: string | null;
  @IsOptional() @IsString() @MaxLength(500) dia_chi?: string | null;
  @IsOptional() @IsUUID() ho_so_id?: string | null;
  @IsOptional() @IsString() @MaxLength(2000) ghi_chu?: string | null;
  @IsOptional() @IsBoolean() bat?: boolean;
}

export class LocDoiTacQuery extends PhanTrangQueryDto {
  @IsOptional() @IsIn(LOAI_DOI_TAC) loai?: (typeof LOAI_DOI_TAC)[number];
  @IsOptional() @IsString() @MaxLength(100) tu_khoa?: string;
}

export class TaoHopDongDto {
  @IsOptional() @IsString() @MaxLength(60) so_hop_dong?: string | null;
  @IsString() @IsNotEmpty() @MaxLength(200) ten: string;
  @IsIn(LOAI_HOP_DONG) loai: (typeof LOAI_HOP_DONG)[number];
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) gia_tri_hop_dong?: number | null;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) doanh_thu_qua?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) chi_phi_tai_tro?: number;
  @IsOptional() @IsObject() ket_qua_chien_dich?: Record<string, number> | null;
  @IsOptional() @IsString() @MaxLength(2000) ket_qua_ghi_chu?: string | null;
  @IsOptional() @IsDateString() bat_dau?: string | null;
  @IsOptional() @IsDateString() ket_thuc?: string | null;
  @IsOptional() @IsIn(TRANG_THAI_HOP_DONG) trang_thai?: (typeof TRANG_THAI_HOP_DONG)[number];
}

export class CapNhatHopDongDto {
  @IsOptional() @IsString() @MaxLength(60) so_hop_dong?: string | null;
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(200) ten?: string;
  @IsOptional() @IsIn(LOAI_HOP_DONG) loai?: (typeof LOAI_HOP_DONG)[number];
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) gia_tri_hop_dong?: number | null;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) doanh_thu_qua?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) chi_phi_tai_tro?: number;
  @IsOptional() @IsObject() ket_qua_chien_dich?: Record<string, number> | null;
  @IsOptional() @IsString() @MaxLength(2000) ket_qua_ghi_chu?: string | null;
  @IsOptional() @IsDateString() bat_dau?: string | null;
  @IsOptional() @IsDateString() ket_thuc?: string | null;
  @IsOptional() @IsIn(TRANG_THAI_HOP_DONG) trang_thai?: (typeof TRANG_THAI_HOP_DONG)[number];
}
