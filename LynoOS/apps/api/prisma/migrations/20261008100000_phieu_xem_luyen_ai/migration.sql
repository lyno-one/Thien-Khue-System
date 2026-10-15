-- Phieu XEM: mo lai mot phien Sales Training da co (chu phien / mentor / quan ly), dang nhap dung nguoi.
-- docs/TICH-HOP-SALES-TRAINING.md muc "Xem phiên từ Thiên Khuê". Chi schema thien_khue — khong dung schema public.

-- CreateEnum
CREATE TYPE "thien_khue"."MucDichPhieuLuyenAi" AS ENUM ('LUYEN', 'XEM');

-- AlterTable
ALTER TABLE "thien_khue"."phieu_luyen_ai" ADD COLUMN     "muc_dich" "thien_khue"."MucDichPhieuLuyenAi" NOT NULL DEFAULT 'LUYEN',
ADD COLUMN     "phien_id_st" TEXT,
ADD COLUMN     "vai_xem" TEXT;

-- Viet tay (Prisma khong quan): phieu XEM phai co phien + vai xem; phieu LUYEN thi khong
ALTER TABLE "thien_khue"."phieu_luyen_ai" ADD CONSTRAINT "phieu_luyen_ai_muc_dich_chk" CHECK (
  (muc_dich = 'LUYEN' AND phien_id_st IS NULL AND vai_xem IS NULL)
  OR (muc_dich = 'XEM' AND phien_id_st IS NOT NULL AND vai_xem IN ('CHU', 'MENTOR', 'QUAN_LY'))
);
