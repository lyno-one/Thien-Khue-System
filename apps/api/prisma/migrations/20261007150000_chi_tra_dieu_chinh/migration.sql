-- LOI-CAN-SUA muc 13 (phan con lai): khoa cung o DB viec chi tra dieu chinh hoa hong + chan de xuat trung dang mo.
-- Chi schema thien_khue — khong dung schema public.

-- AlterTable
ALTER TABLE "thien_khue"."dieu_chinh_hoa_hong" ADD COLUMN     "de_xuat_chi_tra_id" UUID;

-- CreateIndex
CREATE INDEX "dieu_chinh_hoa_hong_de_xuat_chi_tra_id_idx" ON "thien_khue"."dieu_chinh_hoa_hong"("de_xuat_chi_tra_id");


-- =====================================================================================
-- Phan viet tay (Prisma khong quan ly index mot phan / backfill)
-- =====================================================================================

-- Backfill: dieu chinh da nam trong de xuat CHI_TRA_HOA_HONG da duyet (truoc day chi suy ra tu du_lieu.dieu_chinh_ids)
UPDATE "thien_khue"."dieu_chinh_hoa_hong" dc
SET "de_xuat_chi_tra_id" = dx."id"
FROM "thien_khue"."de_xuat_duyet" dx
CROSS JOIN LATERAL jsonb_array_elements_text(
  CASE WHEN jsonb_typeof(dx."du_lieu" -> 'dieu_chinh_ids') = 'array' THEN dx."du_lieu" -> 'dieu_chinh_ids' ELSE '[]'::jsonb END
) AS e(id)
WHERE dx."loai" = 'CHI_TRA_HOA_HONG'
  AND dx."trang_thai" = 'DA_DUYET'
  AND e.id = dc."id"::text
  AND dc."de_xuat_chi_tra_id" IS NULL;

-- Mot doi tuong chi co MOT de xuat dang mo cho cac loai quyet dinh mot lan (xac minh don, duyet qua / voucher, chi tra ky).
-- Ung dung da kiem truoc khi tao; index nay chan hai request dong thoi (P2002 -> 409 qua LoiFilter).
-- Khong ap cho CHUYEN_VAI / DIEU_CHINH_HOA_HONG: mot ho so co the co nhieu de xuat hop le cung luc.
CREATE UNIQUE INDEX "de_xuat_duyet_dang_mo_doi_tuong_key" ON "thien_khue"."de_xuat_duyet"("loai", "doi_tuong", "doi_tuong_id")
  WHERE "trang_thai" IN ('CHO_KIEM', 'CHO_DUYET')
    AND "loai" IN ('XAC_MINH_DON', 'DUYET_QUA_TANG', 'DUYET_VOUCHER', 'CHI_TRA_HOA_HONG');
