// Truy van Prisma cua module cong-khai. Lop: LienHeRepository.
import { Injectable } from "@nestjs/common";
import type { LoaiLead, Prisma } from "@prisma/client";
import { PrismaService } from "../infrastructure/prisma/prisma.service";

/** Truy van thien_khue.lead cho form lien he cong khai */
@Injectable()
export class LienHeRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Lead cung SDT + loai + trang tao tu moc `tu` tro di (de gop trung) */
  timLeadTrung(q: { sdtChuan: string; loai: LoaiLead; nguon: string; tu: Date }): Promise<{ id: string } | null> {
    return this.prisma.lead.findFirst({
      where: { sdt_chuan: q.sdtChuan, loai: q.loai, nguon: q.nguon, created_at: { gte: q.tu } },
      select: { id: true }
    });
  }

  taoLead(data: Prisma.leadUncheckedCreateInput): Promise<{ id: string }> {
    return this.prisma.lead.create({ data, select: { id: true } });
  }
}
