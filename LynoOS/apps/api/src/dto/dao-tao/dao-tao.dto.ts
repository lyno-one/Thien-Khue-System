import { Transform, Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf
} from "class-validator";
import { NGUONG_DAT_TOI_THIEU } from "../../common/utils/dao-tao";
import type {
  ChamThucHanhBody,
  LoaiKhoaHoc,
  LoaiNoiDungBaiHoc,
  NopBaiKiemTraBody,
  NopThucHanhBody,
  SuaBaiHocBody,
  SuaBaiKiemTraBody,
  SuaCauHoiBody,
  SuaKhoaHocBody,
  TaoBaiHocBody,
  TaoBaiKiemTraBody,
  TaoCauHoiBody,
  TaoKhoaHocBody,
  TangPhienBanBody,
  TrangThaiHocVien,
  TrangThaiThucHanh,
  YeuCauHocLai
} from "@thien-khue/contracts";
import type { Vai } from "@prisma/client";
import { PhanTrangQueryDto } from "../../common/utils/phan-trang";

// Ban sao gia tri enum de validate (api chi import type tu contracts)
const DS_VAI: Vai[] = ["KHACH", "SALE", "CSKH", "CTV", "THUC_TAP", "KOL", "KOC", "MENTOR", "DOI_TAC", "QUAN_LY", "ADMIN", "THIEN_KHUE"];
const DS_LOAI_KHOA: LoaiKhoaHoc[] = ["NEN_TANG", "NGHIEP_VU", "SAN_PHAM"];
const DS_LOAI_NOI_DUNG: LoaiNoiDungBaiHoc[] = ["MARKDOWN", "VIDEO"];
const DS_TRANG_THAI_TH: TrangThaiThucHanh[] = ["CHO_CHAM", "DAT", "CHUA_DAT"];
const DS_TRANG_THAI_HV: TrangThaiHocVien[] = ["HOAN_THANH", "DANG_HOC", "CHUA_BAT_DAU", "CAN_HO_TRO"];
const DS_YEU_CAU: YeuCauHocLai[] = ["XAC_NHAN", "THI_LAI"];

const MA_HOP_LE = /^[a-z0-9][a-z0-9-_.]*$/i;
const URL_OPTS = { require_protocol: true, protocols: ["http", "https"] };

/** "true"/"false" trong query -> boolean */
const chuoiSangBool = ({ value }: { value: unknown }) => (value === "true" ? true : value === "false" ? false : value);

// ------------------------------------------------------------------ nguoi hoc

export class LocKhoaHocQueryDto {
  @IsOptional()
  @IsIn(DS_LOAI_KHOA)
  loai?: LoaiKhoaHoc;
}

export class NopBaiKiemTraDto implements NopBaiKiemTraBody {
  @IsUUID()
  luot_lam_id: string;

  /** { [cau_hoi_id]: number[] } — kiem chi tiet trong service (bat buoc tra loi het) */
  @IsObject()
  tra_loi: Record<string, number[]>;
}

export class NopThucHanhDto implements NopThucHanhBody {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  tieu_de?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  mo_ta?: string;

  @IsOptional()
  @IsUrl(URL_OPTS, { message: "Đường dẫn bài làm không hợp lệ" })
  @MaxLength(2000)
  link?: string;

  @IsOptional()
  @IsUrl(URL_OPTS, { message: "Đường dẫn tệp không hợp lệ" })
  @MaxLength(2000)
  tep_url?: string;

  @IsOptional()
  @IsIn(DS_VAI)
  vai?: Vai;
}

export class ChamThucHanhDto implements ChamThucHanhBody {
  @IsIn(["DAT", "CHUA_DAT"])
  ket_qua: "DAT" | "CHUA_DAT";

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  diem?: number;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  nhan_xet?: string;
}

export class LocThucHanhQueryDto extends PhanTrangQueryDto {
  @IsOptional()
  @IsIn(DS_TRANG_THAI_TH)
  trang_thai?: TrangThaiThucHanh;

  @IsOptional()
  @IsUUID()
  khoa_hoc_id?: string;
}

export class KiemQuyenSkuQueryDto {
  @IsOptional()
  @IsUUID()
  mau_id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  ma_mau?: string;
}

export class LocTienDoDoiQueryDto extends PhanTrangQueryDto {
  @IsOptional()
  @IsIn(DS_VAI)
  vai?: Vai;

  @IsOptional()
  @IsIn(DS_TRANG_THAI_HV)
  trang_thai?: TrangThaiHocVien;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  tu_khoa?: string;
}

// ------------------------------------------------------------------ quan tri noi dung

export class LocKhoaHocQuanTriQueryDto extends PhanTrangQueryDto {
  @IsOptional()
  @IsIn(DS_LOAI_KHOA)
  loai?: LoaiKhoaHoc;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  tu_khoa?: string;

  @IsOptional()
  @Transform(chuoiSangBool)
  @IsBoolean()
  bat?: boolean;
}

export class TaoKhoaHocDto implements TaoKhoaHocBody {
  @IsString()
  @Matches(MA_HOP_LE, { message: "Mã khoá chỉ gồm chữ không dấu, số, gạch nối" })
  @MaxLength(80)
  ma: string;

  @IsString()
  @MinLength(2)
  @MaxLength(200)
  ten: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  mo_ta?: string;

  @IsIn(DS_LOAI_KHOA)
  loai: LoaiKhoaHoc;

  @IsArray()
  @ArrayMinSize(1)
  @IsIn(DS_VAI, { each: true })
  vai_ap_dung: Vai[];

  @IsOptional()
  @IsUUID()
  mau_id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  ma_mau?: string;

  @IsOptional()
  @IsBoolean()
  bat_buoc?: boolean;

  @IsOptional()
  @IsBoolean()
  can_thuc_hanh?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  yeu_cau_thuc_hanh?: string;

  @IsOptional()
  @Matches(/^#[0-9a-f]{6}$/i, { message: "Màu dạng #RRGGBB" })
  mau_sac?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  thu_tu?: number;

  @IsOptional()
  @IsBoolean()
  bat?: boolean;
}

export class SuaKhoaHocDto implements SuaKhoaHocBody {
  @IsOptional()
  @IsString()
  @Matches(MA_HOP_LE, { message: "Mã khoá chỉ gồm chữ không dấu, số, gạch nối" })
  @MaxLength(80)
  ma?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  ten?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  mo_ta?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsIn(DS_VAI, { each: true })
  vai_ap_dung?: Vai[];

  @IsOptional()
  @IsBoolean()
  bat_buoc?: boolean;

  @IsOptional()
  @IsBoolean()
  can_thuc_hanh?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  yeu_cau_thuc_hanh?: string;

  @IsOptional()
  @Matches(/^#[0-9a-f]{6}$/i, { message: "Màu dạng #RRGGBB" })
  mau_sac?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  thu_tu?: number;

  @IsOptional()
  @IsBoolean()
  bat?: boolean;
}

export class TangPhienBanDto implements TangPhienBanBody {
  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  ly_do: string;

  @IsOptional()
  @IsIn(DS_YEU_CAU)
  yeu_cau?: YeuCauHocLai;
}

export class TaoBaiHocDto implements TaoBaiHocBody {
  @IsString()
  @Matches(MA_HOP_LE, { message: "Mã bài chỉ gồm chữ không dấu, số, gạch nối" })
  @MaxLength(80)
  ma: string;

  @IsString()
  @MinLength(2)
  @MaxLength(300)
  tieu_de: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  chuong?: string;

  @IsOptional()
  @IsIn(DS_LOAI_NOI_DUNG)
  loai_noi_dung?: LoaiNoiDungBaiHoc;

  @IsOptional()
  @IsString()
  @MaxLength(200_000)
  noi_dung?: string;

  @IsOptional()
  @IsUrl(URL_OPTS)
  video_url?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  tom_tat?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(600)
  thoi_luong_phut?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  thu_tu?: number;

  @IsOptional()
  @IsBoolean()
  bat?: boolean;
}

export class SuaBaiHocDto implements SuaBaiHocBody {
  @IsOptional()
  @IsString()
  @Matches(MA_HOP_LE, { message: "Mã bài chỉ gồm chữ không dấu, số, gạch nối" })
  @MaxLength(80)
  ma?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(300)
  tieu_de?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  chuong?: string;

  @IsOptional()
  @IsIn(DS_LOAI_NOI_DUNG)
  loai_noi_dung?: LoaiNoiDungBaiHoc;

  @IsOptional()
  @IsString()
  @MaxLength(200_000)
  noi_dung?: string;

  @IsOptional()
  @IsUrl(URL_OPTS)
  video_url?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  tom_tat?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(600)
  thoi_luong_phut?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  thu_tu?: number;

  @IsOptional()
  @IsBoolean()
  bat?: boolean;
}

export class TaoBaiKiemTraDto implements TaoBaiKiemTraBody {
  @IsString()
  @Matches(MA_HOP_LE, { message: "Mã bài kiểm tra chỉ gồm chữ không dấu, số, gạch nối" })
  @MaxLength(80)
  ma: string;

  @IsString()
  @MinLength(2)
  @MaxLength(300)
  tieu_de: string;

  /** Luat cung README: dat khi >= 90% — khong ai ha duoc duoi 90 (DB cung CHECK 90..100) */
  @IsOptional()
  @IsInt()
  @Min(NGUONG_DAT_TOI_THIEU, { message: `Ngưỡng đạt tối thiểu ${NGUONG_DAT_TOI_THIEU}%` })
  @Max(100)
  nguong_dat?: number;

  @IsOptional()
  @IsBoolean()
  bat_buoc?: boolean;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsInt()
  @Min(1)
  so_cau_hien?: number | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsInt()
  @Min(1)
  @Max(600)
  thoi_gian_phut?: number | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsInt()
  @Min(1)
  so_lan_toi_da?: number | null;

  @IsOptional()
  @IsBoolean()
  bat?: boolean;
}

export class SuaBaiKiemTraDto implements SuaBaiKiemTraBody {
  @IsOptional()
  @IsString()
  @Matches(MA_HOP_LE, { message: "Mã bài kiểm tra chỉ gồm chữ không dấu, số, gạch nối" })
  @MaxLength(80)
  ma?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(300)
  tieu_de?: string;

  /** Luat cung README: dat khi >= 90% — khong ai ha duoc duoi 90 (DB cung CHECK 90..100) */
  @IsOptional()
  @IsInt()
  @Min(NGUONG_DAT_TOI_THIEU, { message: `Ngưỡng đạt tối thiểu ${NGUONG_DAT_TOI_THIEU}%` })
  @Max(100)
  nguong_dat?: number;

  @IsOptional()
  @IsBoolean()
  bat_buoc?: boolean;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsInt()
  @Min(1)
  so_cau_hien?: number | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsInt()
  @Min(1)
  @Max(600)
  thoi_gian_phut?: number | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsInt()
  @Min(1)
  so_lan_toi_da?: number | null;

  @IsOptional()
  @IsBoolean()
  bat?: boolean;
}

export class TaoCauHoiDto implements TaoCauHoiBody {
  @IsString()
  @Matches(MA_HOP_LE, { message: "Mã câu chỉ gồm chữ không dấu, số, gạch nối" })
  @MaxLength(80)
  ma: string;

  @IsString()
  @MinLength(3)
  @MaxLength(2000)
  noi_dung: string;

  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(500, { each: true })
  lua_chon: string[];

  @IsArray()
  @ArrayMinSize(1)
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(0, { each: true })
  dap_an: number[];

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  giai_thich?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  diem?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  thu_tu?: number;
}

export class SuaCauHoiDto implements SuaCauHoiBody {
  @IsOptional()
  @IsString()
  @Matches(MA_HOP_LE, { message: "Mã câu chỉ gồm chữ không dấu, số, gạch nối" })
  @MaxLength(80)
  ma?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(2000)
  noi_dung?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(500, { each: true })
  lua_chon?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(0, { each: true })
  dap_an?: number[];

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  giai_thich?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  diem?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  thu_tu?: number;
}
