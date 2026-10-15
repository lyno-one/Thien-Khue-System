import { Module } from "@nestjs/common";
import { CoreModule } from "./modules/core.module";
import { BanHangModule } from "./modules/ban-hang.module";
import { CongKhaiModule } from "./modules/cong-khai.module";
import { DaoTaoModule } from "./modules/dao-tao.module";
import { HoSoModule } from "./modules/ho-so.module";
import { KhachDoiTacModule } from "./modules/khach-doi-tac.module";
import { MangLuoiModule } from "./modules/mang-luoi.module";
import { QuanTriModule } from "./modules/quan-tri.module";

/** Agent module KHONG sua file nay — can dang ky them gi thi ghi vao ket qua tra ve */
@Module({
  imports: [CoreModule, HoSoModule, DaoTaoModule, CongKhaiModule, BanHangModule, MangLuoiModule, KhachDoiTacModule, QuanTriModule]
})
export class AppModule {}
