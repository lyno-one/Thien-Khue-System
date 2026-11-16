import { Body, Controller, Get, Header, Headers, Ip, Param, ParseUUIDPipe, Post } from "@nestjs/common";
import { Equals, IsEmail, IsString, Length, MaxLength } from "class-validator";
import { CongKhai, NguoiDung } from "../common/decorators/xac-thuc.decorator";
import type { ThongTinNguoiDung } from "../common/types/nguoi-dung.type";
import { LynoFriendsService } from "../services/lyno-friends.service";

class DangKyFriendsDto { @Equals(true) dong_y!: boolean; }
class TaiKhoanFriendsDto {
  @IsEmail() @MaxLength(254) email!: string;
  @IsString() @Length(2, 120) ho_ten!: string;
  @Equals(true) dong_y!: boolean;
}

@Controller("lyno-friends")
export class LynoFriendsController {
  constructor(private readonly friends: LynoFriendsService) {}
  @CongKhai()
  @Post("tai-khoan") taiKhoan(@Body() body: TaiKhoanFriendsDto, @Ip() ip: string) { return this.friends.moiTaiKhoan(body.email, body.ho_ten, ip); }
  @Post("dang-ky") dangKy(@NguoiDung() nd: ThongTinNguoiDung, @Body() body: DangKyFriendsDto) { return this.friends.dangKy(nd.id, body.dong_y); }
  @Header("Cache-Control", "no-store")
  @Get("dieu-kien") dieuKien(@NguoiDung() nd: ThongTinNguoiDung) { return this.friends.dieuKien(nd.id); }
  @Header("Cache-Control", "no-store")
  @Post("mo-affi") moAffi(@NguoiDung() nd: ThongTinNguoiDung) { return this.friends.moAffi(nd.id); }
  @CongKhai()
  @Header("Cache-Control", "no-store")
  @Get("don/:id")
  dongDon(@Param("id", ParseUUIDPipe) id: string, @Headers("x-lyno-friends-key") key: string) {
    this.friends.kiemKhoa(key);
    return this.friends.dongDon(id);
  }
  @CongKhai()
  @Header("Cache-Control", "no-store")
  @Get("nguoi-hoc/:id")
  nguoiHoc(@Param("id", ParseUUIDPipe) id: string, @Headers("x-lyno-friends-key") key: string) {
    this.friends.kiemKhoa(key);
    return this.friends.dieuKien(id);
  }
}
