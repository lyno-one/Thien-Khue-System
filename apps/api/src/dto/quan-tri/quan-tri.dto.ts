import { Transform, Type } from "class-transformer";
import { IsBoolean, IsDateString, IsEnum, IsIn, IsInt, IsObject, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min } from "class-validator";
import { LoaiDeXuat, NguonDon, TrangThaiDeXuat, TrangThaiGhiNhan, TrangThaiVai, Vai } from "@prisma/client";
import { PhanTrangQueryDto } from "../../common/utils/phan-trang";

const catChuoi = ({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() || undefined : value);

// ------------------------------------------------------------------ de xuat

export class TaoDeXuatDto {
  @IsEnum(LoaiDeXuat, { message: "Loại đề xuất không hợp lệ" })
  loai!: LoaiDeXuat;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  doi_tuong?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  doi_tuong_id?: string | null;

  @IsObject({ message: "du_lieu phải là object" })
  du_lieu!: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  ly_do?: string;
}

export class QuyetDinhDto {
  @IsBoolean({ message: "dong_y phải là true / false" })
  dong_y!: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  y_kien?: string;
}

export class HuyDeXuatDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  ly_do?: string;
}

export class DeXuatQueryDto extends PhanTrangQueryDto {
  @IsOptional()
  @IsEnum(TrangThaiDeXuat)
  trang_thai?: TrangThaiDeXuat;

  @IsOptional()
  @IsEnum(LoaiDeXuat)
  loai?: LoaiDeXuat;

  @IsOptional()
  @IsIn(["CUA_TOI", "CAN_TOI"])
  pham_vi?: "CUA_TOI" | "CAN_TOI";
}

// ------------------------------------------------------------------ ho so / bang dieu hanh

export class NguoiDungQueryDto extends PhanTrangQueryDto {
  @IsOptional()
  @Transform(catChuoi)
  @IsString()
  @MaxLength(100)
  tu_khoa?: string;

  @IsOptional()
  @IsEnum(Vai)
  vai?: Vai;

  @IsOptional()
  @IsEnum(TrangThaiVai)
  trang_thai_vai?: TrangThaiVai;
}

export class NguoiHocQueryDto extends PhanTrangQueryDto {
  /** Loc theo vai (lo trinh), vd SALE */
  @IsOptional()
  @IsEnum(Vai)
  vai?: Vai;
}

export class KhachHangQueryDto {
  /** Tim mot khach theo SDT; bo trong = danh sach khach mua nhieu nhat */
  @IsOptional()
  @Transform(catChuoi)
  @IsString()
  @MaxLength(20)
  sdt?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  so_lan_toi_thieu?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  gioi_han?: number;
}

export class SanPhamQueryDto extends PhanTrangQueryDto {
  @IsOptional()
  @Transform(catChuoi)
  @IsString()
  @MaxLength(100)
  tu_khoa?: string;

  @IsOptional()
  @Transform(({ value }) => value === true || value === "true" || value === "1")
  @IsBoolean()
  bao_gom_ngung?: boolean;
}

export class NhatKyQueryDto extends PhanTrangQueryDto {
  @IsOptional()
  @IsUUID()
  ho_so_id?: string;

  @IsOptional()
  @Transform(catChuoi)
  @IsString()
  @MaxLength(60)
  doi_tuong?: string;

  @IsOptional()
  @Transform(catChuoi)
  @IsString()
  @MaxLength(100)
  doi_tuong_id?: string;

  @IsOptional()
  @Transform(catChuoi)
  @IsString()
  @MaxLength(60)
  hanh_dong?: string;

  @IsOptional()
  @IsDateString({ strict: false }, { message: "tu_ngay dạng YYYY-MM-DD" })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  tu_ngay?: string;

  @IsOptional()
  @IsDateString({ strict: false }, { message: "den_ngay dạng YYYY-MM-DD" })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  den_ngay?: string;
}

export class GiaoDichQueryDto extends PhanTrangQueryDto {
  @IsOptional()
  @IsEnum(TrangThaiGhiNhan)
  trang_thai?: TrangThaiGhiNhan;

  @IsOptional()
  @IsEnum(NguonDon)
  nguon?: NguonDon;

  @IsOptional()
  @Transform(catChuoi)
  @IsString()
  @MaxLength(60)
  tu_khoa?: string;
}

export class DoiTacQueryDto extends PhanTrangQueryDto {
  @IsOptional()
  @Transform(catChuoi)
  @IsString()
  @MaxLength(100)
  tu_khoa?: string;
}
