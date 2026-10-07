import { ValidationPipe } from "@nestjs/common";
import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested
} from "class-validator";
import type { DiemKyNangLuyenAi, KetQuaLuyenAiBody, LoaiLuyenAi, TaoPhieuLuyenAiBody, ViPhamLuyenAi } from "@thien-khue/contracts";

const LOAI: LoaiLuyenAi[] = ["TU_VAN", "DOI_TRA"];

export class TaoPhieuLuyenAiDto implements TaoPhieuLuyenAiBody {
  /** uuid hoac ma khoa */
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  khoa_hoc_id: string;

  @IsIn(LOAI, { message: "Loại luyện tập phải là TU_VAN hoặc DOI_TRA" })
  loai: LoaiLuyenAi;
}

class DiemKyNangDto implements Partial<DiemKyNangLuyenAi> {
  @IsOptional() @IsNumber() @Min(0) @Max(100) khai_thac?: number;
  @IsOptional() @IsNumber() @Min(0) @Max(100) lang_nghe?: number;
  @IsOptional() @IsNumber() @Min(0) @Max(100) gia_tri?: number;
  @IsOptional() @IsNumber() @Min(0) @Max(100) phan_doi?: number;
  @IsOptional() @IsNumber() @Min(0) @Max(100) chot?: number;
  @IsOptional() @IsNumber() @Min(0) @Max(100) tuan_thu?: number;
}

class ViPhamDto implements Partial<ViPhamLuyenAi> {
  @IsOptional() @IsString() @MaxLength(200) loai?: string;
  @IsOptional() @IsString() @MaxLength(2000) trich?: string;
}

/**
 * Ket qua Sales Training gui ve. Truong la (vd ten khach) bi BO, khong bao loi — Sales Training gui lai theo lich,
 * loi 400 vi them truong se lap vo han. Transcript khong bao gio duoc luu (khong co cot).
 */
export class KetQuaLuyenAiDto implements Omit<KetQuaLuyenAiBody, "diem_ky_nang" | "vi_pham" | "tom_tat" | "diem_manh" | "can_cai_thien" | "link_xem" | "ket_thuc_luc"> {
  @IsString() @MinLength(1) @MaxLength(200) ma_phieu: string;
  @IsString() @MinLength(1) @MaxLength(200) phien_id: string;
  @IsString() @MinLength(1) @MaxLength(100) crm_user_id: string;
  @IsIn(LOAI) loai: LoaiLuyenAi;
  @IsNumber() @Min(0) @Max(100) diem_tong: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => DiemKyNangDto)
  diem_ky_nang?: DiemKyNangDto;

  @IsInt() @Min(0) @Max(1000) so_vi_pham: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => ViPhamDto)
  vi_pham?: ViPhamDto[];

  @IsOptional() @IsString() @MaxLength(5000) tom_tat?: string;

  @IsOptional() @IsArray() @ArrayMaxSize(20) @IsString({ each: true }) @MaxLength(1000, { each: true }) diem_manh?: string[];
  @IsOptional() @IsArray() @ArrayMaxSize(20) @IsString({ each: true }) @MaxLength(1000, { each: true }) can_cai_thien?: string[];

  @IsOptional()
  @IsUrl({ protocols: ["http", "https"], require_protocol: true, require_tld: false }, { message: "link_xem không hợp lệ" })
  @MaxLength(2000)
  link_xem?: string;

  @IsOptional() @IsDateString() ket_thuc_luc?: string;
}

/**
 * Kieu tham so controller cho body ket qua: PHAI la interface (metadata = Object) de pipe toan cuc (forbidNonWhitelisted)
 * bo qua — neu de class / type import, metadata thanh Function va moi truong bi bao "should not exist".
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ThanKetQuaLuyenAi extends KetQuaLuyenAiDto {}

/** Pipe rieng cho body ket qua: whitelist (bo truong la) nhung KHONG tu choi truong la — xem KetQuaLuyenAiDto */
export const ketQuaLuyenAiPipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: false,
  transform: true,
  expectedType: KetQuaLuyenAiDto
});
