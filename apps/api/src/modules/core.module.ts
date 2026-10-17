import { Global, Module } from "@nestjs/common";
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { HealthController } from "../controllers/health.controller";
import { ThongBaoController } from "../controllers/thong-bao.controller";
import { JwtGuard } from "../common/guards/jwt.guard";
import { NguoiDungService, NhatKyService, ThongBaoService } from "../services/core.service";
import { VaiGuard } from "../common/guards/vai.guard";
import { XacThucTokenService } from "../infrastructure/supabase/xac-thuc-token.service";
import { CrmApiClient } from "../infrastructure/crm/crm-api.client";
import { CrmDocService } from "../infrastructure/crm/crm-doc.service";
import { BaoResponseInterceptor } from "../common/interceptors/bao-response.interceptor";
import { LoiFilter } from "../common/filters/loi.filter";
import { PrismaService } from "../infrastructure/prisma/prisma.service";
import { CoreRepository } from "../repositories/core.repository";
import { SupabaseAdminService } from "../infrastructure/supabase/supabase-admin.service";

/**
 * Nen tang dung chung (Global): moi module inject truc tiep PrismaService, CrmDocService, CrmApiClient,
 * SupabaseAdminService, NhatKyService, ThongBaoService, NguoiDungService — khong can import CoreModule.
 * Truy van nhat_ky / thong_bao / ho so dang nhap: CoreRepository (chi dung trong core).
 * Guard toan cuc: JwtGuard -> VaiGuard. Interceptor { data } + filter loi toan cuc.
 */
@Global()
@Module({
  controllers: [HealthController, ThongBaoController],
  providers: [
    PrismaService,
    CoreRepository,
    CrmDocService,
    CrmApiClient,
    SupabaseAdminService,
    NhatKyService,
    ThongBaoService,
    XacThucTokenService,
    NguoiDungService,
    { provide: APP_GUARD, useClass: JwtGuard },
    { provide: APP_GUARD, useClass: VaiGuard },
    { provide: APP_INTERCEPTOR, useClass: BaoResponseInterceptor },
    { provide: APP_FILTER, useClass: LoiFilter }
  ],
  exports: [PrismaService, CrmDocService, CrmApiClient, SupabaseAdminService, NhatKyService, ThongBaoService, NguoiDungService, XacThucTokenService]
})
export class CoreModule {}
