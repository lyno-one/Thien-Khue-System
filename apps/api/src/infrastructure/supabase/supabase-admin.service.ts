import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { layCauHinh } from "../../config/cau-hinh";

/**
 * Supabase service-role — CHI dung cho Auth admin (doc user). Thien Khue KHONG tao / xoa tai khoan:
 * tai khoan do admin tao trong CRM. Khong dung client nay de doc / ghi bang (dung Prisma / CrmDocService).
 */
@Injectable()
export class SupabaseAdminService {
  private client: SupabaseClient | null = null;

  private layClient(): SupabaseClient {
    if (!this.client) {
      const ch = layCauHinh();
      this.client = createClient(ch.supabaseUrl, ch.supabaseServiceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      });
    }
    return this.client;
  }

  /** Ngoai le LYNO Friends: chi moi hoc vien xac nhan email; khong cap vai lam viec. */
  async moiHocVienFriends(email: string, hoTen: string): Promise<void> {
    const redirectTo = new URL("/lyno-friends", process.env.THIEN_KHUE_WEB_URL || "http://localhost:3300").toString();
    const { error } = await this.layClient().auth.admin.inviteUserByEmail(email.trim().toLowerCase(), { redirectTo, data: { full_name: hoTen.trim(), lyno_friends: true } });
    // Cung mot thong bao cho email cu / moi, khong lo danh sach tai khoan.
    if (error && error.status !== 422 && error.code !== "email_exists") throw new ServiceUnavailableException("Chưa gửi được email xác nhận, vui lòng thử lại sau");
  }

  /** Lay user Auth theo id */
  async layNguoiDung(id: string): Promise<User | null> {
    const { data, error } = await this.layClient().auth.admin.getUserById(id);
    if (error) return null;
    return data.user ?? null;
  }
}
