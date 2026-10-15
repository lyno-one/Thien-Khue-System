-- CreateEnum
CREATE TYPE "thien_khue"."TrangThaiYeuCauHoTro" AS ENUM ('MO', 'DA_XU_LY');

-- DropIndex
DROP INDEX "thien_khue"."moi_kh_hanh_phuc_sdt_chuan_idx";

-- AlterTable
ALTER TABLE "thien_khue"."luot_lam" ADD COLUMN     "cau_hoi_ids" UUID[] DEFAULT ARRAY[]::UUID[];

-- AlterTable
ALTER TABLE "thien_khue"."voucher" ADD COLUMN     "nguoi_de_xuat_id" UUID,
ADD COLUMN     "nguoi_tham_dinh_id" UUID;

-- CreateTable
CREATE TABLE "thien_khue"."yeu_cau_ho_tro" (
    "id" UUID NOT NULL,
    "nguoi_gui_id" UUID NOT NULL,
    "nguoi_ho_tro_id" UUID NOT NULL,
    "ma_mau" TEXT,
    "noi_dung" TEXT NOT NULL,
    "lien_ket" TEXT,
    "trang_thai" "thien_khue"."TrangThaiYeuCauHoTro" NOT NULL DEFAULT 'MO',
    "tra_loi" TEXT,
    "xu_ly_luc" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "yeu_cau_ho_tro_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "yeu_cau_ho_tro_nguoi_ho_tro_id_trang_thai_idx" ON "thien_khue"."yeu_cau_ho_tro"("nguoi_ho_tro_id", "trang_thai");

-- CreateIndex
CREATE INDEX "yeu_cau_ho_tro_nguoi_gui_id_created_at_idx" ON "thien_khue"."yeu_cau_ho_tro"("nguoi_gui_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "dieu_chinh_hoa_hong_de_xuat_duyet_id_key" ON "thien_khue"."dieu_chinh_hoa_hong"("de_xuat_duyet_id");

-- CreateIndex
CREATE INDEX "ma_gioi_thieu_ho_so_id_mau_id_chien_dich_id_idx" ON "thien_khue"."ma_gioi_thieu"("ho_so_id", "mau_id", "chien_dich_id");

-- CreateIndex
CREATE UNIQUE INDEX "moi_kh_hanh_phuc_sdt_chuan_key" ON "thien_khue"."moi_kh_hanh_phuc"("sdt_chuan");


-- =====================================================================================
-- Phan viet tay (Prisma khong quan ly index mot phan / CHECK)
-- =====================================================================================

-- Moi SDT chi mot nguoi DANG_PHU_TRACH (ban-hang van khoa pg_advisory_xact_lock; day la lop chan cuoi o DB)
CREATE UNIQUE INDEX "giao_khach_mot_nguoi_phu_trach" ON "thien_khue"."giao_khach"("sdt_chuan") WHERE "trang_thai" = 'DANG_PHU_TRACH';

-- Qua tang: maker-checker 3 nguoi khac nhau (de xuat / tham dinh / duyet)
ALTER TABLE "thien_khue"."qua_tang"
  ADD CONSTRAINT "qua_tang_tham_dinh_khac_de_xuat" CHECK ("nguoi_tham_dinh_id" IS NULL OR "nguoi_tham_dinh_id" IS DISTINCT FROM "nguoi_de_xuat_id"),
  ADD CONSTRAINT "qua_tang_duyet_khac_hai_nguoi" CHECK (
    "nguoi_duyet_id" IS NULL OR ("nguoi_duyet_id" IS DISTINCT FROM "nguoi_de_xuat_id" AND "nguoi_duyet_id" IS DISTINCT FROM "nguoi_tham_dinh_id")
  );

-- Voucher: nguoi tao khong tu tham dinh / duyet
ALTER TABLE "thien_khue"."voucher"
  ADD CONSTRAINT "voucher_tham_dinh_khac_de_xuat" CHECK ("nguoi_tham_dinh_id" IS NULL OR "nguoi_tham_dinh_id" IS DISTINCT FROM "nguoi_de_xuat_id"),
  ADD CONSTRAINT "voucher_duyet_khac_de_xuat" CHECK ("nguoi_duyet_id" IS NULL OR "nguoi_duyet_id" IS DISTINCT FROM "nguoi_de_xuat_id");

-- Voucher cu: dien nguoi_de_xuat_id tu nhat_ky TAO_VOUCHER (truoc day nguoi tao chi nam o nhat ky)
UPDATE "thien_khue"."voucher" v SET "nguoi_de_xuat_id" = nk."ho_so_id"
FROM (
  SELECT DISTINCT ON ("doi_tuong_id") "doi_tuong_id", "ho_so_id" FROM "thien_khue"."nhat_ky"
  WHERE "doi_tuong" = 'voucher' AND "hanh_dong" = 'TAO_VOUCHER' ORDER BY "doi_tuong_id", "created_at" ASC
) nk
WHERE v."id"::text = nk."doi_tuong_id"::text AND v."nguoi_de_xuat_id" IS NULL;
