-- LOI-CAN-SUA muc 9/11: nguong dat bai kiem tra khong the duoi 90% (README: bai kiem tra bat buoc >= 90%).
-- Chi schema thien_khue. Du lieu cu duoi 90 (neu co) nang len 90 truoc khi doi CHECK.
UPDATE "thien_khue"."bai_kiem_tra" SET "nguong_dat" = 90 WHERE "nguong_dat" < 90;

ALTER TABLE "thien_khue"."bai_kiem_tra" DROP CONSTRAINT IF EXISTS "bai_kiem_tra_nguong_dat";
ALTER TABLE "thien_khue"."bai_kiem_tra" ADD CONSTRAINT "bai_kiem_tra_nguong_dat" CHECK ("nguong_dat" BETWEEN 90 AND 100);
