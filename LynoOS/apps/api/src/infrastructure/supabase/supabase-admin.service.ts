import { Injectable } from "@nestjs/common";
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

  /** Lay user Auth theo id */
  async layNguoiDung(id: string): Promise<User | null> {
    const { data, error } = await this.layClient().auth.admin.getUserById(id);
    if (error) return null;
    return data.user ?? null;
  }
}
