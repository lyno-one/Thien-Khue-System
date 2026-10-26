// Bai hoc Lyno — bai hoc tao tren CRM (/kb cua CRM), hoc ngay trong Thien Khue.
import { BadRequestException, ForbiddenException, Injectable } from "@nestjs/common";
import type { BaiLynoChiTiet, KetQuaQuizBaiLyno, LoTrinhBaiLyno, NopQuizBaiLynoBody, QuizBaiLyno } from "@thien-khue/contracts";
import type { ThongTinNguoiDung } from "../common/types/nguoi-dung.type";
import { laUuid } from "../common/utils/dao-tao";
import { kiemTraLoiQuizLyno } from "../common/utils/dao-tao-bai-lyno";
import { CrmApiClient } from "../infrastructure/crm/crm-api.client";

/**
 * CRM la nguon goc: Thien Khue KHONG sao chep bai / tien do vao thien_khue, moi lan doc / ghi deu goi song CRM /api/kb/*
 * bang token cua chinh nguoi dung. CRM tu chon bai theo nhom quyen phong ban -> chuc danh, tu tinh tien do va cham quiz
 * — o day khong tinh lai. Loi CRM (404 bai tat, 403...) tra nguyen cho web.
 * Bai Lyno KHONG tinh vao kich hoat vai cua Thien Khue (hoc truoc khi ban, XetDatService) — hai luong doc lap.
 */
@Injectable()
export class BaiLynoService {
  constructor(private readonly crm: CrmApiClient) {}

  /** Chi nhan su CRM moi co bai hoc tren CRM — chan truoc khi goi CRM (khach / nguoi ngoai khong co tai khoan CRM) */
  private kiemNhanSuCrm(nd: ThongTinNguoiDung): void {
    if (!nd.hoSo.crm_user_id) throw new ForbiddenException("Chỉ nhân sự Lyno mới học bài trên CRM");
  }

  private kiemId(id: string, ten: string): void {
    if (!laUuid(id)) throw new BadRequestException(`Mã ${ten} không hợp lệ`);
  }

  layLoTrinh(nd: ThongTinNguoiDung, token: string): Promise<LoTrinhBaiLyno> {
    this.kiemNhanSuCrm(nd);
    return this.crm.layLoTrinhKb<LoTrinhBaiLyno>(token);
  }

  layBai(nd: ThongTinNguoiDung, token: string, baiId: string): Promise<BaiLynoChiTiet> {
    this.kiemNhanSuCrm(nd);
    this.kiemId(baiId, "bài học");
    return this.crm.layBaiKb<BaiLynoChiTiet>(token, baiId);
  }

  danhDauDaDoc(nd: ThongTinNguoiDung, token: string, baiId: string): Promise<void> {
    this.kiemNhanSuCrm(nd);
    this.kiemId(baiId, "bài học");
    return this.crm.danhDauDaDocKb(token, baiId);
  }

  async layQuiz(nd: ThongTinNguoiDung, token: string, baiId: string): Promise<QuizBaiLyno | null> {
    this.kiemNhanSuCrm(nd);
    this.kiemId(baiId, "bài học");
    return (await this.crm.layQuizKb<QuizBaiLyno | null>(token, baiId)) ?? null;
  }

  nopQuiz(nd: ThongTinNguoiDung, token: string, quizId: string, body: NopQuizBaiLynoBody): Promise<KetQuaQuizBaiLyno> {
    this.kiemNhanSuCrm(nd);
    this.kiemId(quizId, "bài kiểm tra");
    const loi = kiemTraLoiQuizLyno(body?.traLoi);
    if (loi) throw new BadRequestException(loi);
    return this.crm.nopQuizKb<KetQuaQuizBaiLyno>(token, quizId, body.traLoi);
  }
}
