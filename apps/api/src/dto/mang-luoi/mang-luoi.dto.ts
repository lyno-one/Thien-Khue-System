import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength
} from "class-validator";
import type {
  CapNhatSoLieuBody,
  ChamBaiTapTtsBody,
  DeXuatChuyenVaiTtsBody,
  DeXuatDieuChinhBody,
  DuyetNoiDungBody,
  DuyetThamGiaBody,
  GhiNhanTheoMaDonBody,
  NopBaiTapTtsBody,
  NopNoiDungBody,
  TaoChienDichBody,
  TaoMaGioiThieuBody,
  XacMinhDonBody
} from "@thien-khue/contracts";
import { PhanTrangQueryDto } from "../../common/utils/phan-trang";

const VAI = ["KHACH", "SALE", "CSKH", "CTV", "THUC_TAP", "KOL", "KOC", "MENTOR", "DOI_TAC", "QUAN_LY", "ADMIN", "THIEN_KHUE"] as const;
const TT_CHIEN_DICH = ["NHAP", "DANG_CHAY", "TAM_DUNG", "KET_THUC"] as const;
const NEN_TANG = ["TIKTOK", "FACEBOOK", "INSTAGRAM", "YOUTUBE", "KHAC"] as const;
const MA_SKU = /^[A-Za-z0-9-]{1,40}$/;
const KY = /^\d{4}-(0[1-9]|1[0-2])$/;

export class TaoMaGioiThieuDto implements TaoMaGioiThieuBody {
  @IsOptional() @IsUUID() mau_id?: string;
  @IsOptional() @IsString() @Matches(MA_SKU, { message: "Mã SKU không hợp lệ" }) ma_mau?: string;
  @IsOptional() @IsUUID() chien_dich_id?: string;
}

export class DoiTrangThaiMaDto {
  @IsBoolean() bat!: boolean;
}

export class GhiClickDto {
  @IsOptional() @IsString() @MaxLength(500) nguon_url?: string;
}

export class TaoChienDichDto implements TaoChienDichBody {
  @IsString() @MinLength(3) @MaxLength(200) ten!: string;
  @IsOptional() @IsString() @MaxLength(5000) mo_ta?: string;
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(50) @IsString({ each: true }) @Matches(MA_SKU, { each: true, message: "Mã SKU không hợp lệ" }) ma_maus!: string[];
  @IsOptional() @IsArray() @IsIn(VAI, { each: true }) vai_ap_dung?: (typeof VAI)[number][];
  @IsOptional() @IsInt() @Min(0) ngan_sach?: number;
  @IsOptional() @IsDateString() bat_dau?: string;
  @IsOptional() @IsDateString() han?: string;
  @IsOptional() @IsIn(TT_CHIEN_DICH) trang_thai?: (typeof TT_CHIEN_DICH)[number];
}

export class CapNhatChienDichDto {
  @IsOptional() @IsString() @MinLength(3) @MaxLength(200) ten?: string;
  @IsOptional() @IsString() @MaxLength(5000) mo_ta?: string;
  @IsOptional() @IsArray() @ArrayMinSize(1) @ArrayMaxSize(50) @IsString({ each: true }) @Matches(MA_SKU, { each: true, message: "Mã SKU không hợp lệ" }) ma_maus?: string[];
  @IsOptional() @IsArray() @IsIn(VAI, { each: true }) vai_ap_dung?: (typeof VAI)[number][];
  @IsOptional() @IsInt() @Min(0) ngan_sach?: number;
  @IsOptional() @IsDateString() bat_dau?: string;
  @IsOptional() @IsDateString() han?: string;
  @IsOptional() @IsIn(TT_CHIEN_DICH) trang_thai?: (typeof TT_CHIEN_DICH)[number];
}

export class NhanChienDichDto {
  @IsOptional() @IsString() @MaxLength(1000) ghi_chu?: string;
}

export class DuyetThamGiaDto implements DuyetThamGiaBody {
  @IsBoolean() dong_y!: boolean;
  @IsOptional() @IsString() @MaxLength(1000) ghi_chu?: string;
}

export class NghiemThuDto {
  @IsOptional() @IsString() @MaxLength(1000) ghi_chu?: string;
}

export class NopNoiDungDto implements NopNoiDungBody {
  @IsOptional() @IsUUID() chien_dich_id?: string;
  @IsOptional() @IsString() @Matches(MA_SKU, { message: "Mã SKU không hợp lệ" }) ma_mau?: string;
  @IsIn(["KICH_BAN", "VIDEO"]) loai!: "KICH_BAN" | "VIDEO";
  @IsString() @MinLength(3) @MaxLength(200) tieu_de!: string;
  @IsOptional() @IsString() @MaxLength(20000) kich_ban?: string;
  @IsOptional() @IsString() @MaxLength(1000) link_video?: string;
  @IsOptional() @IsIn(NEN_TANG) nen_tang?: (typeof NEN_TANG)[number];
  @IsOptional() @IsBoolean() luu_nhap?: boolean;
}

export class SuaNoiDungDto {
  @IsOptional() @IsString() @Matches(MA_SKU, { message: "Mã SKU không hợp lệ" }) ma_mau?: string;
  @IsOptional() @IsIn(["KICH_BAN", "VIDEO"]) loai?: "KICH_BAN" | "VIDEO";
  @IsOptional() @IsString() @MinLength(3) @MaxLength(200) tieu_de?: string;
  @IsOptional() @IsString() @MaxLength(20000) kich_ban?: string;
  @IsOptional() @IsString() @MaxLength(1000) link_video?: string;
  @IsOptional() @IsIn(NEN_TANG) nen_tang?: (typeof NEN_TANG)[number];
  @IsOptional() @IsBoolean() luu_nhap?: boolean;
}

export class CapNhatSoLieuDto implements CapNhatSoLieuBody {
  @Type(() => Number) @IsInt() @Min(0) @Max(2_000_000_000) luot_xem!: number;
  @Type(() => Number) @IsInt() @Min(0) @Max(2_000_000_000) luot_tuong_tac!: number;
  @IsOptional() @IsBoolean() da_dang?: boolean;
}

export class DuyetNoiDungDto implements DuyetNoiDungBody {
  @IsIn(["DA_DUYET", "CAN_SUA", "TU_CHOI"]) ket_qua!: "DA_DUYET" | "CAN_SUA" | "TU_CHOI";
  @IsOptional() @IsString() @MaxLength(2000) nhan_xet?: string;
}

export class NoiDungQuanLyQueryDto {
  @IsOptional() @IsIn(["NHAP", "CHO_DUYET", "CAN_SUA", "DA_DUYET", "TU_CHOI", "DA_DANG"]) trang_thai?: "NHAP" | "CHO_DUYET" | "CAN_SUA" | "DA_DUYET" | "TU_CHOI" | "DA_DANG";
  @IsOptional() @IsUUID() chien_dich_id?: string;
}

export class ThamGiaQueryDto {
  @IsOptional() @IsUUID() chien_dich_id?: string;
}

export class NopBaiTapTtsDto implements NopBaiTapTtsBody {
  @IsUUID() khoa_hoc_id!: string;
  @IsString() @MinLength(3) @MaxLength(200) tieu_de!: string;
  @IsOptional() @IsString() @MaxLength(5000) mo_ta?: string;
  @IsOptional() @IsString() @MaxLength(1000) link?: string;
}

export class ChamBaiTapTtsDto implements ChamBaiTapTtsBody {
  @IsIn(["DAT", "CHUA_DAT"]) ket_qua!: "DAT" | "CHUA_DAT";
  @Type(() => Number) @IsInt() @Min(0) @Max(100) diem!: number;
  @IsString() @MinLength(3) @MaxLength(2000) nhan_xet!: string;
}

export class BaiTapMentorQueryDto {
  @IsOptional() @IsIn(["CHO_CHAM", "DAT", "CHUA_DAT"]) trang_thai?: "CHO_CHAM" | "DAT" | "CHUA_DAT";
  @IsOptional() @IsUUID() ho_so_id?: string;
}

export class DeXuatChuyenVaiDto implements DeXuatChuyenVaiTtsBody {
  @IsUUID() ho_so_id!: string;
  @IsIn(["SALE", "CSKH", "CTV", "KOC", "KOL"]) sang_vai!: "SALE" | "CSKH" | "CTV" | "KOC" | "KOL";
  @IsOptional() @IsIn(["DANG_HOC", "HOAT_DONG"]) trang_thai_moi?: "DANG_HOC" | "HOAT_DONG";
  @IsString() @MinLength(5) @MaxLength(2000) ly_do!: string;
}

export class GhiNhanTheoMaDonDto implements GhiNhanTheoMaDonBody {
  @IsString() @MinLength(2) @MaxLength(40) ma_don!: string;
  @IsOptional() @IsString() @Matches(/^[A-Za-z0-9-]{4,40}$/, { message: "Mã giới thiệu không hợp lệ" }) ma_gioi_thieu?: string;
}

export class XacMinhDonDto implements XacMinhDonBody {
  @IsIn(["GIOI_THIEU", "NGUOI_CHOT", "KHONG_AI"]) chon!: "GIOI_THIEU" | "NGUOI_CHOT" | "KHONG_AI";
  @IsString() @MinLength(5) @MaxLength(2000) ly_do!: string;
}

export class GhiNhanQueryDto extends PhanTrangQueryDto {
  @IsOptional() @IsIn(["HOP_LE", "CHO_XAC_MINH", "BI_HUY", "DA_DOI_SOAT"]) trang_thai?: "HOP_LE" | "CHO_XAC_MINH" | "BI_HUY" | "DA_DOI_SOAT";
}

export class HoaHongQueryDto extends PhanTrangQueryDto {
  @IsOptional() @IsIn(["CHO_DOI_SOAT", "DU_DIEU_KIEN", "DA_TRA", "BI_TRU"]) trang_thai?: "CHO_DOI_SOAT" | "DU_DIEU_KIEN" | "DA_TRA" | "BI_TRU";
  @IsOptional() @Matches(KY, { message: "Kỳ dạng YYYY-MM" }) ky?: string;
}

export class DeXuatDieuChinhDto implements DeXuatDieuChinhBody {
  @IsUUID() ho_so_id!: string;
  @Type(() => Number) @IsInt() @Min(-1_000_000_000) @Max(1_000_000_000) so_tien!: number;
  @IsString() @MinLength(5) @MaxLength(2000) ly_do!: string;
  @IsOptional() @Matches(KY, { message: "Kỳ dạng YYYY-MM" }) ky?: string;
  @IsOptional() @IsUUID() hoa_hong_id?: string;
}
