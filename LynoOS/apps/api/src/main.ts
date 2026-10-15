import { config as napEnv } from "dotenv";
// .env.local truoc (khoa that, khong commit), .env sau — truoc moi import doc process.env
napEnv({ path: [".env.local", ".env"], quiet: true });

import "reflect-metadata";
import { Logger, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { AppModule } from "./app.module";
import { layCauHinh } from "./config/cau-hinh";

async function khoiDong() {
  const ch = layCauHinh();
  // rawBody: HmacStGuard ky / kiem tren than request GOC (Sales Training ky truoc khi JSON.parse)
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { logger: ["error", "warn", "log"], rawBody: true });
  // Sau proxy / CDN: TRUST_PROXY=1 (so hop) / true / dai IP -> req.ip la IP that (rate-limit dang ky, form lien he)
  const trustProxy = process.env.TRUST_PROXY?.trim();
  if (trustProxy) app.set("trust proxy", /^\d+$/.test(trustProxy) ? Number(trustProxy) : trustProxy === "true" ? true : trustProxy);
  // Header bao mat co ban cho JSON API (khong co helmet trong dependency)
  app.use((_req: unknown, res: { setHeader(k: string, v: string): void }, next: () => void) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    next();
  });
  app.setGlobalPrefix("api");
  app.enableCors({ origin: ch.corsOrigins, credentials: true, methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"] });
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true, stopAtFirstError: false })
  );
  app.enableShutdownHooks();
  await app.listen(ch.port);
  new Logger("ThienKhue").log(`API chạy ở http://localhost:${ch.port}/api`);
}

void khoiDong();
