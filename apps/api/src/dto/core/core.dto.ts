import { Transform, Type } from "class-transformer";
import { ArrayMaxSize, IsArray, IsBoolean, IsInt, IsOptional, IsUUID, Max, Min } from "class-validator";

// DTO nen tang (thong bao)

export class LocThongBaoQuery {
  @IsOptional() @Transform(({ value }) => value === true || value === "true" || value === "1") @IsBoolean() chi_chua_doc?: boolean;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) gioi_han?: number;
}

export class DanhDauDaDocDto {
  /** Bo trong = danh dau tat ca thong bao chua doc cua minh */
  @IsOptional() @IsArray() @ArrayMaxSize(100) @IsUUID("all", { each: true }) ids?: string[];
}
