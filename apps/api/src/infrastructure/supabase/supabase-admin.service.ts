import { ConflictException, Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { layCauHinh } from "../../config/cau-hinh";

/**
 * Supabase service-role — CHI dung cho Auth admin (tao tai khoan khi dang ky: CRM tat tu dang ky).
 * Khong dung client nay de doc / ghi bang (dung Prisma / CrmDocService).
 * Luu y: trigger CRM tao_ho_so_user se tao dong public.users active=false — chap nhan (KIEN-TRUC muc 4).
 */
@Injectable()
export class SupabaseAdminService {
  private readonly logger = new Logger("SupabaseAdmin");
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

  /** Tao tai khoan Auth (email da xac nhan). Email da ton tai -> 409 */
  async taoNguoiDung(input: { email: string; matKhau: string; hoTen: string; sdt?: string }): Promise<User> {
    const { data, error } = await this.layClient().auth.admin.createUser({
      email: input.email.trim().toLowerCase(),
      password: input.matKhau,
      email_confirm: true,
      user_metadata: { full_name: input.hoTen.trim(), ho_ten: input.hoTen.trim(), sdt: input.sdt ?? null, nguon: "thien_khue" }
    });
    if (error || !data.user) {
      const msg = error?.message ?? "";
      if (error?.status === 422 || /already|registered|exists/i.test(msg)) {
        throw new ConflictException("Email đã được đăng ký");
      }
      this.logger.error(`createUser: ${error?.status ?? ""} ${msg}`);
      throw new ServiceUnavailableException("Không tạo được tài khoản, thử lại sau");
    }
    return data.user;
  }

  /** Lay user Auth theo id */
  async layNguoiDung(id: string): Promise<User | null> {
    const { data, error } = await this.layClient().auth.admin.getUserById(id);
    if (error) return null;
    return data.user ?? null;
  }

  /** Xoa user Auth (hoan tac khi dang ky loi giua chung) */
  async xoaNguoiDung(id: string): Promise<void> {
    const { error } = await this.layClient().auth.admin.deleteUser(id);
    if (error) this.logger.error(`deleteUser ${id}: ${error.message}`);
  }
}
