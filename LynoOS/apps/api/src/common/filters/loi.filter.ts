import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { Response } from "express";

const MA_THEO_STATUS: Record<number, string> = {
  400: "BAD_REQUEST",
  401: "UNAUTHORIZED",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  409: "CONFLICT",
  410: "GONE",
  413: "PAYLOAD_TOO_LARGE",
  422: "UNPROCESSABLE",
  429: "TOO_MANY_REQUESTS",
  502: "BAD_GATEWAY",
  503: "SERVICE_UNAVAILABLE"
};

interface ThanLoi {
  error: { code: string; message: string; details?: unknown };
}

/**
 * Chuan hoa moi loi thanh { error: { code, message, details? } } (cung dang CRM).
 * Loi la (Prisma, bug) -> 500 "Lỗi hệ thống", chi log server — khong lo stack / SQL cho client.
 */
@Catch()
export class LoiFilter implements ExceptionFilter {
  private readonly logger = new Logger("Loi");

  catch(loi: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();
    const [status, than] = this.chuyen(loi);
    res.status(status).json(than);
  }

  private chuyen(loi: unknown): [number, ThanLoi] {
    if (loi instanceof HttpException) {
      const status = loi.getStatus();
      const r = loi.getResponse();
      const code = MA_THEO_STATUS[status] ?? (status >= 500 ? "INTERNAL_ERROR" : "ERROR");
      if (typeof r === "string") return [status, { error: { code, message: r } }];
      const o = r as { message?: unknown; code?: string; details?: unknown };
      // ValidationPipe: message la mang cac loi
      if (Array.isArray(o.message)) {
        return [status, { error: { code: "VALIDATION_ERROR", message: "Dữ liệu gửi lên không hợp lệ", details: o.message } }];
      }
      const message = typeof o.message === "string" ? o.message : loi.message;
      return [status, { error: { code: o.code ?? code, message, ...(o.details !== undefined ? { details: o.details } : {}) } }];
    }
    if (loi instanceof Prisma.PrismaClientKnownRequestError) {
      if (loi.code === "P2002") return [HttpStatus.CONFLICT, { error: { code: "CONFLICT", message: "Dữ liệu bị trùng" } }];
      if (loi.code === "P2025") return [HttpStatus.NOT_FOUND, { error: { code: "NOT_FOUND", message: "Không tìm thấy dữ liệu" } }];
      if (loi.code === "P2003") return [HttpStatus.BAD_REQUEST, { error: { code: "BAD_REQUEST", message: "Dữ liệu tham chiếu không tồn tại" } }];
    }
    this.logger.error(loi instanceof Error ? `${loi.name}: ${loi.message}\n${loi.stack ?? ""}` : String(loi));
    return [HttpStatus.INTERNAL_SERVER_ERROR, { error: { code: "INTERNAL_ERROR", message: "Lỗi hệ thống" } }];
  }
}
