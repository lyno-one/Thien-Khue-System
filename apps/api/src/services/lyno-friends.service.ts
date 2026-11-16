import { BadRequestException, ForbiddenException, HttpException, Injectable, ServiceUnavailableException } from "@nestjs/common";
import { timingSafeEqual } from "node:crypto";
import { LynoFriendsRepository } from "../repositories/lyno-friends.repository";
import { luotDuocTinh, tinhTienDo } from "../common/utils/dao-tao";
import { CrmDocService } from "../infrastructure/crm/crm-doc.service";
import { SupabaseAdminService } from "../infrastructure/supabase/supabase-admin.service";

@Injectable()
export class LynoFriendsService {
  constructor(private readonly repo: LynoFriendsRepository, private readonly crm: CrmDocService, private readonly auth: SupabaseAdminService) {}
  private readonly lanMoi = new Map<string, number[]>();

  async moiTaiKhoan(email: string, hoTen: string, ip: string) {
    const now = Date.now();
    for (const [k, ds] of this.lanMoi) if (!ds.some(t => t > now - 3600000)) this.lanMoi.delete(k);
    const keys = [`ip:${ip}`, `email:${email.toLowerCase()}`];
    for (const k of keys) {
      const ds = (this.lanMoi.get(k) || []).filter(t => t > now - 3600000);
      if (ds.length >= (k.startsWith("ip:") ? 5 : 1)) throw new HttpException("Đã gửi yêu cầu, vui lòng kiểm tra email hoặc thử lại sau", 429);
      this.lanMoi.set(k, [...ds, now]);
    }
    await this.auth.moiHocVienFriends(email, hoTen);
    return { message: "Nếu email chưa có tài khoản, chị sẽ nhận thư xác nhận. Nếu đã có tài khoản, chọn Đăng nhập để tiếp tục." };
  }

  async dongDon(id: string) {
    const don = await this.crm.layDon(id);
    if (!don || don.loai_don !== "BAN_HANG" || ["huy", "hoan"].includes(don.trang_thai) || don.da_tra_hang) throw new BadRequestException("Đơn mua không còn hợp lệ");
    return { lines: (await this.crm.layDongDon(id)).map(d => ({ code: d.ma_mau, amount: d.so_luong * d.don_gia })) };
  }

  kiemKhoa(giaTri: string | undefined) {
    const khoa = process.env.LYNO_FRIENDS_INTEGRATION_KEY || "";
    if (khoa.length < 32 || !giaTri || Buffer.byteLength(khoa) !== Buffer.byteLength(giaTri) || !timingSafeEqual(Buffer.from(khoa), Buffer.from(giaTri))) throw new ForbiddenException("Kết nối không hợp lệ");
  }

  async dangKy(id: string, dongY: boolean) {
    if (dongY !== true) throw new BadRequestException("Cần xác nhận tự nguyện tham gia LYNO Friends");
    await this.repo.dangKy(id);
    return this.dieuKien(id);
  }

  async dieuKien(id: string) {
    const { hoSo, dangKy, khoa, hoc } = await this.repo.duLieu(id);
    if (!hoSo) throw new BadRequestException("Không tìm thấy hồ sơ học viên");
    const vai = hoSo.vai_tro.find(v => v.vai === "CTV");
    const duocHoc = !!dangKy && !!vai && ["DANG_HOC", "HOAT_DONG"].includes(vai.trang_thai);
    const tienDo = khoa.map(k => ({ k, td: tinhTienDo(k, hoc) }));
    const nenTangDat = tienDo.filter(({ k }) => k.bat_buoc && k.loai !== "SAN_PHAM").every(({ td }) => td.hoan_thanh);
    const products = duocHoc && nenTangDat ? tienDo.filter(({ k, td }) => {
      if (k.loai !== "SAN_PHAM" || !k.mau_id || !k.ma_mau || !td.hoan_thanh) return false;
      const quyen = hoc.quyenSku.find(q => q.mau_id === k.mau_id);
      if (quyen?.trang_thai !== "HOAT_DONG") return false;
      // Kiem tung de bat buoc, khong lay diem cao cua de A bu cho de B.
      return k.bai_kiem_tra.filter(de => de.bat_buoc).every(de => hoc.luotLam.some(l => l.bai_kiem_tra_id === de.id && l.diem >= 90 && luotDuocTinh(k, l, quyen)));
    }).map(({ k, td }) => ({ code: k.ma_mau!, courseId: k.id, score: td.luotDat!.diem, version: k.phien_ban_tai_lieu })) : [];
    return {
      subject: id, name: hoSo.ho_ten, phone: hoSo.sdt_chuan || hoSo.sdt, enrolled: !!dangKy,
      ready: products.length > 0,
      products,
      courses: tienDo.map(({ k, td }) => ({ id: k.id, name: k.ten, code: k.ma_mau, type: k.loai, completed: td.hoan_thanh, progress: td.phan_tram, score: td.diem_cao_nhat }))
    };
  }

  async moAffi(id: string) {
    const dk = await this.dieuKien(id);
    if (!dk.enrolled || !dk.ready) throw new ForbiddenException("Học hết bài và thi đạt từ 90% cho ít nhất một mã sản phẩm trước khi mở Affi");
    const key = process.env.LYNO_FRIENDS_INTEGRATION_KEY || "";
    if (key.length < 32) throw new ServiceUnavailableException("Chưa cấu hình kết nối Affi");
    const apiUrl = (process.env.AFFILIATE_API_URL || "http://127.0.0.1:8787").replace(/\/+$/, "");
    try {
      const res = await fetch(`${apiUrl}/hooks/lyno-friends/provision`, { method: "POST", headers: { "content-type": "application/json", "x-lyno-friends-key": key }, body: JSON.stringify({ subject: id }), signal: AbortSignal.timeout(15000) });
      const data = await res.json() as { url?: string; message?: string };
      if (!res.ok || !data.url) throw new Error(data.message || "Không mở được Affi");
      // Dia chi dich chi tu cau hinh, khong nhan return_url tu client.
      const portal = new URL(process.env.AFFILIATE_PORTAL_URL || "http://localhost:8790");
      if (new URL(data.url).origin !== portal.origin) throw new Error("Địa chỉ cổng Affi chưa khớp cấu hình");
      return { url: data.url };
    } catch (e) { throw new ServiceUnavailableException(e instanceof Error ? e.message : "Chưa kết nối được Affi"); }
  }
}
