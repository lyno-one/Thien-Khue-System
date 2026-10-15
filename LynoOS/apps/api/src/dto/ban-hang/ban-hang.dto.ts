import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested
} from "class-validator";
import { PhanTrangQueryDto } from "../../common/utils/phan-trang";

const GIO = /^([01]\d|2[0-3]):[0-5]\d$/;
const NGAY = /^\d{4}-\d{2}-\d{2}$/;
const VAI_CA = ["SALE", "CSKH"] as const;
const KENH = ["website", "facebook", "cua_hang", "khac"] as const;
const TRANG_THAI_LEAD = ["MOI", "DA_PHAN_BO", "DANG_XU_LY", "THANH_CONG", "THAT_BAI", "TRUNG"] as const;

// ------------------------------------------------------------------ ca truc

export class TaoCaTrucDto {
  @IsUUID()
  ho_so_id!: string;

  @Matches(NGAY, { message: "Ngày phải dạng YYYY-MM-DD" })
  ngay!: string;

  @Matches(GIO, { message: "Giờ bắt đầu phải dạng HH:mm" })
  tu_gio!: string;

  @Matches(GIO, { message: "Giờ kết thúc phải dạng HH:mm" })
  den_gio!: string;

  @IsIn(VAI_CA)
  vai!: (typeof VAI_CA)[number];

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  so_khach_toi_da?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  ghi_chu?: string | null;
}

export class SuaCaTrucDto {
  @IsOptional()
  @Matches(NGAY, { message: "Ngày phải dạng YYYY-MM-DD" })
  ngay?: string;

  @IsOptional()
  @Matches(GIO, { message: "Giờ bắt đầu phải dạng HH:mm" })
  tu_gio?: string;

  @IsOptional()
  @Matches(GIO, { message: "Giờ kết thúc phải dạng HH:mm" })
  den_gio?: string;

  @IsOptional()
  @IsIn(VAI_CA)
  vai?: (typeof VAI_CA)[number];

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  so_khach_toi_da?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  ghi_chu?: string | null;
}

export class CaTrucQueryDto {
  @IsOptional()
  @Matches(NGAY, { message: "Ngày phải dạng YYYY-MM-DD" })
  tu_ngay?: string;

  @IsOptional()
  @Matches(NGAY, { message: "Ngày phải dạng YYYY-MM-DD" })
  den_ngay?: string;

  @IsOptional()
  @IsUUID()
  ho_so_id?: string;
}

// ------------------------------------------------------------------ nang luc

export class LuuNangLucDto {
  @IsUUID()
  ho_so_id!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  ma_mau?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  nhom?: string | null;

  @IsInt()
  @Min(1)
  @Max(5)
  muc!: number;
}

// ------------------------------------------------------------------ lead & khach

export class LeadQueryDto extends PhanTrangQueryDto {
  @IsOptional()
  @IsIn(TRANG_THAI_LEAD)
  trang_thai?: (typeof TRANG_THAI_LEAD)[number];

  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;
}

export class DoiTrangThaiLeadDto {
  @IsIn(["DANG_XU_LY", "THANH_CONG", "THAT_BAI", "TRUNG"])
  trang_thai!: "DANG_XU_LY" | "THANH_CONG" | "THAT_BAI" | "TRUNG";

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  ghi_chu?: string | null;
}

export class PhanBoThuCongDto {
  @IsOptional()
  @IsUUID()
  ho_so_id?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  ly_do?: string | null;
}

export class PhanBoKhachDto {
  @IsString()
  @MinLength(9)
  @MaxLength(30)
  sdt!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  ten_khach?: string | null;

  @IsOptional()
  @IsUUID()
  ho_so_id?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  ly_do?: string | null;
}

export class GiaoLaiKhachDto {
  @IsOptional()
  @IsUUID()
  ho_so_id?: string | null;

  @IsString()
  @MinLength(3, { message: "Cần ghi lý do giao lại" })
  @MaxLength(500)
  ly_do!: string;
}

export class KhachDuocGiaoQueryDto extends PhanTrangQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  @IsOptional()
  @IsUUID()
  ho_so_id?: string;
}

export class GhiChamDto {
  @IsString()
  @MinLength(1, { message: "Nội dung chăm sóc không được trống" })
  @MaxLength(2000)
  noi_dung!: string;
}

// ------------------------------------------------------------------ don

export class DongDonDto {
  @IsUUID()
  mau_id!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  size?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  mau_sac?: string;

  @IsInt()
  @Min(1)
  @Max(100_000)
  so_luong!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1_000_000_000)
  don_gia?: number;
}

export class TaoDonDto {
  @IsIn(KENH)
  kenh!: (typeof KENH)[number];

  @IsString()
  @MinLength(1, { message: "Thiếu tên khách" })
  @MaxLength(200)
  khach_ten!: string;

  @IsString()
  @MinLength(9)
  @MaxLength(30)
  khach_sdt!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  khach_dia_chi?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  ghi_chu?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  ma_gioi_thieu?: string | null;

  @ValidateNested({ each: true })
  @Type(() => DongDonDto)
  @ArrayMinSize(1, { message: "Đơn phải có ít nhất một dòng hàng" })
  @ArrayMaxSize(200)
  dong!: DongDonDto[];
}

// ------------------------------------------------------------------ ho tro KOL / KOC

export class TaoYeuCauHoTroDto {
  @IsString()
  @MinLength(5, { message: "Mô tả nội dung cần hỗ trợ (ít nhất 5 ký tự)" })
  @MaxLength(2000)
  noi_dung!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  ma_mau?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  lien_ket?: string | null;
}

export class TraLoiHoTroDto {
  @IsString()
  @MinLength(1, { message: "Nội dung trả lời không được trống" })
  @MaxLength(2000)
  tra_loi!: string;
}
