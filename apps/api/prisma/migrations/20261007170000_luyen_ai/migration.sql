-- Tich hop Sales Training (docs/TICH-HOP-SALES-TRAINING.md): buoc "Luyen tu van voi AI" cho SALE / CSKH.
-- Chi schema thien_khue — khong dung schema public.

-- CreateEnum
CREATE TYPE "thien_khue"."NguonThucHanh" AS ENUM ('NOP_TAY', 'LUYEN_AI');

-- CreateEnum
CREATE TYPE "thien_khue"."LoaiLuyenAi" AS ENUM ('TU_VAN', 'DOI_TRA');

-- AlterTable
ALTER TABLE "thien_khue"."bai_thuc_hanh" ADD COLUMN     "bang_chung" JSONB,
ADD COLUMN     "nguon" "thien_khue"."NguonThucHanh" NOT NULL DEFAULT 'NOP_TAY';

-- AlterTable
ALTER TABLE "thien_khue"."khoa_hoc" ADD COLUMN     "yeu_cau_luyen_ai" JSONB;

-- CreateTable
CREATE TABLE "thien_khue"."phieu_luyen_ai" (
    "id" UUID NOT NULL,
    "ma" TEXT NOT NULL,
    "ho_so_id" UUID NOT NULL,
    "khoa_hoc_id" UUID NOT NULL,
    "loai" "thien_khue"."LoaiLuyenAi" NOT NULL,
    "het_han" TIMESTAMPTZ(6) NOT NULL,
    "dung_luc" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "phieu_luyen_ai_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "thien_khue"."phien_luyen_ai" (
    "id" UUID NOT NULL,
    "phien_id_st" TEXT NOT NULL,
    "ma_phieu" TEXT,
    "ho_so_id" UUID NOT NULL,
    "khoa_hoc_id" UUID NOT NULL,
    "loai" "thien_khue"."LoaiLuyenAi" NOT NULL,
    "diem_tong" INTEGER NOT NULL,
    "diem_ky_nang" JSONB NOT NULL,
    "so_vi_pham" INTEGER NOT NULL DEFAULT 0,
    "vi_pham" JSONB NOT NULL DEFAULT '[]',
    "tom_tat" TEXT,
    "diem_manh" JSONB NOT NULL DEFAULT '[]',
    "can_cai_thien" JSONB NOT NULL DEFAULT '[]',
    "dat" BOOLEAN NOT NULL,
    "link_xem" TEXT,
    "ket_thuc_luc" TIMESTAMPTZ(6),
    "nhan_luc" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "phien_luyen_ai_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "phieu_luyen_ai_ma_key" ON "thien_khue"."phieu_luyen_ai"("ma");

-- CreateIndex
CREATE INDEX "phieu_luyen_ai_ho_so_id_created_at_idx" ON "thien_khue"."phieu_luyen_ai"("ho_so_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "phien_luyen_ai_phien_id_st_key" ON "thien_khue"."phien_luyen_ai"("phien_id_st");

-- CreateIndex
CREATE INDEX "phien_luyen_ai_ho_so_id_khoa_hoc_id_loai_idx" ON "thien_khue"."phien_luyen_ai"("ho_so_id", "khoa_hoc_id", "loai");

-- AddForeignKey
ALTER TABLE "thien_khue"."phieu_luyen_ai" ADD CONSTRAINT "phieu_luyen_ai_ho_so_id_fkey" FOREIGN KEY ("ho_so_id") REFERENCES "thien_khue"."ho_so"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thien_khue"."phieu_luyen_ai" ADD CONSTRAINT "phieu_luyen_ai_khoa_hoc_id_fkey" FOREIGN KEY ("khoa_hoc_id") REFERENCES "thien_khue"."khoa_hoc"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thien_khue"."phien_luyen_ai" ADD CONSTRAINT "phien_luyen_ai_ho_so_id_fkey" FOREIGN KEY ("ho_so_id") REFERENCES "thien_khue"."ho_so"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thien_khue"."phien_luyen_ai" ADD CONSTRAINT "phien_luyen_ai_khoa_hoc_id_fkey" FOREIGN KEY ("khoa_hoc_id") REFERENCES "thien_khue"."khoa_hoc"("id") ON DELETE CASCADE ON UPDATE CASCADE;



-- =====================================================================================
-- Phan viet tay (Prisma khong quan ly CHECK / index mot phan)
-- =====================================================================================

ALTER TABLE "thien_khue"."phien_luyen_ai" ADD CONSTRAINT "phien_luyen_ai_diem_tong" CHECK ("diem_tong" BETWEEN 0 AND 100);
ALTER TABLE "thien_khue"."phien_luyen_ai" ADD CONSTRAINT "phien_luyen_ai_so_vi_pham" CHECK ("so_vi_pham" >= 0);
-- Dat chi khi khong co vi pham (luat cung: cam ket sai chinh sach la truot du diem cao)
ALTER TABLE "thien_khue"."phien_luyen_ai" ADD CONSTRAINT "phien_luyen_ai_dat_khong_vi_pham" CHECK (NOT "dat" OR "so_vi_pham" = 0);
ALTER TABLE "thien_khue"."bai_thuc_hanh" ADD CONSTRAINT "bai_thuc_hanh_bang_chung_luyen_ai" CHECK ("nguon" <> 'LUYEN_AI' OR "bang_chung" IS NOT NULL);

-- Moi hoc vien / khoa chi MOT bai LUYEN_AI dang cho cham: hai ket qua den cung luc khong tao hai bai (P2002 -> thu lai)
CREATE UNIQUE INDEX "bai_thuc_hanh_luyen_ai_cho_cham_key" ON "thien_khue"."bai_thuc_hanh"("ho_so_id", "khoa_hoc_id")
  WHERE "trang_thai" = 'CHO_CHAM' AND "nguon" = 'LUYEN_AI';
