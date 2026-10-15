import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import { createRemoteJWKSet, decodeProtectedHeader, jwtVerify, type JWTPayload } from "jose";
import { layCauHinh } from "../../config/cau-hinh";

/** Danh tinh lay tu access token DA verify */
export interface TokenDaXacThuc {
  sub: string;
  email: string | null;
  sdt: string | null;
  hoTen: string | null;
  sessionId: string | null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Ma loi jose do TOKEN sai (-> 401). Loi con lai (khong tai duoc JWKS, timeout) -> 503 */
const LOI_TOKEN = new Set([
  "ERR_JWT_EXPIRED",
  "ERR_JWT_CLAIM_VALIDATION_FAILED",
  "ERR_JWT_INVALID",
  "ERR_JWS_INVALID",
  "ERR_JWS_SIGNATURE_VERIFICATION_FAILED",
  "ERR_JWKS_NO_MATCHING_KEY",
  "ERR_JWKS_MULTIPLE_MATCHING_KEYS",
  "ERR_JOSE_ALG_NOT_ALLOWED",
  "ERR_JOSE_NOT_SUPPORTED"
]);

/**
 * Verify access token Supabase TAI CHO qua JWKS (ES256) — giong CRM auth.repository.ts:
 * chu ky + exp, iss = `${SUPABASE_URL}/auth/v1`, aud chua "authenticated", role = "authenticated", sub la uuid.
 * jose tu cache JWKS + tai lai khi gap kid la (cooldown 30 s).
 */
@Injectable()
export class XacThucTokenService {
  private readonly logger = new Logger("XacThucToken");
  private jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

  private layJwks() {
    if (!this.jwks) {
      const ch = layCauHinh();
      this.jwks = createRemoteJWKSet(new URL(`${ch.supabaseUrl}/auth/v1/.well-known/jwks.json`), {
        // gateway Supabase local / cloud chap nhan apikey; JWKS la cong khai
        headers: ch.supabaseAnonKey ? { apikey: ch.supabaseAnonKey } : {},
        timeoutDuration: 5_000,
        cooldownDuration: 30_000,
        cacheMaxAge: 10 * 60_000
      });
    }
    return this.jwks;
  }

  /** null = token khong hop le (401). Nem 503 khi he thong xac thuc khong san sang. */
  async xacThuc(token: string): Promise<TokenDaXacThuc | null> {
    if (!token || token.split(".").length !== 3) return null;
    try {
      const header = decodeProtectedHeader(token);
      if (header.alg !== "ES256" || !header.kid) return null;
    } catch {
      return null;
    }

    let payload: JWTPayload;
    try {
      const kq = await jwtVerify(token, this.layJwks(), {
        issuer: `${layCauHinh().supabaseUrl}/auth/v1`,
        audience: "authenticated",
        algorithms: ["ES256"],
        clockTolerance: 5
      });
      payload = kq.payload;
    } catch (e) {
      const code = (e as { code?: string }).code;
      if (code && LOI_TOKEN.has(code)) return null;
      this.logger.error(`Không xác thực được token: ${code ?? ""} ${e instanceof Error ? e.message : String(e)}`);
      throw new ServiceUnavailableException("Hệ thống xác thực tạm thời không sẵn sàng");
    }

    if (payload.role !== "authenticated") return null;
    if (typeof payload.sub !== "string" || !UUID.test(payload.sub)) return null;
    const meta = (payload.user_metadata ?? {}) as Record<string, unknown>;
    const chuoi = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
    return {
      sub: payload.sub,
      email: chuoi(payload.email),
      // CHI lay phone da xac thuc boi Supabase — user_metadata nguoi dung tu sua duoc (PUT /auth/v1/user)
      sdt: chuoi(payload.phone),
      hoTen: chuoi(meta.full_name) ?? chuoi(meta.ho_ten) ?? chuoi(meta.name),
      sessionId: chuoi(payload.session_id)
    };
  }
}
