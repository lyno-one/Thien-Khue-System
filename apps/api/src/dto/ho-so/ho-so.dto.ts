import { Transform } from "class-transformer";
import { IsIn, IsOptional, IsString, IsUrl, Matches, MaxLength, MinLength, ValidateIf } from "class-validator";
import { Vai as VaiEnum, type Vai } from "@prisma/client";
import { PhanTrangQueryDto } from "../../common/utils/phan-trang";

/** Moi vai (enum Prisma — API khong import gia tri runtime tu contracts) */
const MOI_VAI = Object.values(VaiEnum) as Vai[];

const catKhoangTrang = ({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value);

/** SDT Viet Nam: 9-12 chu so sau khi bo khoang trang / dau cham / gach; cho phep +84 */
const MAU_SDT = /^\+?[0-9 .\-()]{9,16}$/;

/** PATCH /api/ho-so/toi */
export class CapNhatHoSoDto {
  @IsOptional()
  @Transform(catKhoangTrang)
  @IsString()
  @MinLength(2, { message: "Họ tên tối thiểu 2 ký tự" })
  @MaxLength(120)
  ho_ten?: string;

  @IsOptional()
  @Transform(catKhoangTrang)
  @ValidateIf((_, v) => v !== null && v !== "")
  @IsString()
  @Matches(MAU_SDT, { message: "Số điện thoại không hợp lệ" })
  sdt?: string | null;

  @IsOptional()
  @Transform(catKhoangTrang)
  @ValidateIf((_, v) => v !== null && v !== "")
  @IsUrl({ protocols: ["https", "http"], require_protocol: true }, { message: "Ảnh đại diện phải là đường dẫn http(s)" })
  @MaxLength(1000)
  anh_dai_dien?: string | null;
}

/** GET /api/ho-so (quan tri) */
export class LocHoSoDto extends PhanTrangQueryDto {
  @IsOptional()
  @Transform(catKhoangTrang)
  @IsString()
  @MaxLength(120)
  tu_khoa?: string;

  @IsOptional()
  @IsIn(MOI_VAI, { message: "Vai trò không hợp lệ" })
  vai?: Vai;
}

/** POST /api/ho-so/:id/vai */
export class ThemVaiDto {
  @IsIn(MOI_VAI, { message: "Vai trò không hợp lệ" })
  vai!: Vai;

  @Transform(catKhoangTrang)
  @IsString()
  @MinLength(3, { message: "Cần ghi lý do" })
  @MaxLength(500)
  ly_do!: string;
}

/** PATCH /api/ho-so/:id/vai/:vai */
export class DoiTrangThaiVaiDto {
  @IsIn(["TAM_DUNG", "HOAT_DONG", "KET_THUC"], { message: "Trạng thái không hợp lệ" })
  trang_thai!: "TAM_DUNG" | "HOAT_DONG" | "KET_THUC";

  @Transform(catKhoangTrang)
  @IsString()
  @MinLength(3, { message: "Cần ghi lý do" })
  @MaxLength(500)
  ly_do!: string;
}

/** POST /api/ho-so/toi/kich-hoat */
export class KichHoatDto {
  @IsIn(MOI_VAI, { message: "Vai trò không hợp lệ" })
  vai!: Vai;
}

/** GET /api/ho-so/xac-minh-sdt?sdt= (CSKH / QUAN_LY) */
export class TimHoSoTheoSdtDto {
  @Transform(catKhoangTrang)
  @IsString()
  @Matches(MAU_SDT, { message: "Số điện thoại không hợp lệ" })
  sdt!: string;
}

/** POST /api/ho-so/:id/xac-minh-sdt — nhan vien da goi vao so nay va chu tai khoan xac nhan */
export class XacMinhSdtDto {
  /** SDT nhan vien vua goi — phai khop SDT hien tai cua ho so */
  @Transform(catKhoangTrang)
  @IsString()
  @Matches(MAU_SDT, { message: "Số điện thoại không hợp lệ" })
  sdt!: string;

  @Transform(catKhoangTrang)
  @IsString()
  @MinLength(3, { message: "Ghi lại cách đã xác nhận (vd: gọi lại số này, khách xác nhận email đăng ký)" })
  @MaxLength(500)
  ghi_chu!: string;
}

/** POST /api/ho-so/:id/huy-xac-minh-sdt (QUAN_LY) */
export class HuyXacMinhSdtDto {
  @Transform(catKhoangTrang)
  @IsString()
  @MinLength(3, { message: "Cần ghi lý do" })
  @MaxLength(500)
  ly_do!: string;
}
