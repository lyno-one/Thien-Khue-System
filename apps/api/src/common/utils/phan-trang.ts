import { Type } from "class-transformer";
import { IsInt, IsOptional, Max, Min } from "class-validator";

/** Query phan trang chuan: ?trang=1&so_dong=20 — ke thua DTO nay trong query cua module */
export class PhanTrangQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  trang?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  so_dong?: number;
}

export interface PhanTrangMeta {
  trang: number;
  so_dong: number;
  tong: number;
  tong_trang: number;
}

/** -> { skip, take } cho Prisma */
export function phanTrang(q: PhanTrangQueryDto | undefined, macDinh = 20): { skip: number; take: number; trang: number; so_dong: number } {
  const trang = q?.trang ?? 1;
  const so_dong = q?.so_dong ?? macDinh;
  return { skip: (trang - 1) * so_dong, take: so_dong, trang, so_dong };
}

export function taoMetaPhanTrang(trang: number, so_dong: number, tong: number): PhanTrangMeta {
  return { trang, so_dong, tong, tong_trang: Math.max(1, Math.ceil(tong / so_dong)) };
}
