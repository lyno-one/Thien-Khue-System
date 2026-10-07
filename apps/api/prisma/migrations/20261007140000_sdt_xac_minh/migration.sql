-- Xac minh SDT ho so (LOI-CAN-SUA muc 1, 3): SDT tu khai chi noi voi du lieu khach CRM khi da xac minh.
-- Chi schema thien_khue — khong dung schema public.

-- AlterTable
ALTER TABLE "thien_khue"."ho_so" ADD COLUMN     "sdt_xac_minh_boi_id" UUID,
ADD COLUMN     "sdt_xac_minh_luc" TIMESTAMPTZ(6);


-- =====================================================================================
-- Phan viet tay (Prisma khong quan ly index mot phan / CHECK / trigger)
-- =====================================================================================

-- Da xac minh thi phai co SDT
ALTER TABLE "thien_khue"."ho_so"
  ADD CONSTRAINT "ho_so_sdt_xac_minh_co_sdt" CHECK ("sdt_xac_minh_luc" IS NULL OR "sdt_chuan" IS NOT NULL);

-- Mot SDT chi gan duoc voi MOT ho so da xac minh (ho so chua xac minh co the trung — khong lo du lieu)
CREATE UNIQUE INDEX "ho_so_sdt_chuan_da_xac_minh_key" ON "thien_khue"."ho_so"("sdt_chuan") WHERE "sdt_xac_minh_luc" IS NOT NULL;

-- Doi SDT bang bat ky duong nao (PATCH ho so, dong bo, sua tay) -> tu xoa xac minh.
-- Ngoai le: cung cau lenh dat moc xac minh MOI (vd OTP xac minh so moi) thi giu.
CREATE OR REPLACE FUNCTION "thien_khue"."xoa_xac_minh_khi_doi_sdt"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."sdt_chuan" IS DISTINCT FROM OLD."sdt_chuan"
     AND NEW."sdt_xac_minh_luc" IS NOT DISTINCT FROM OLD."sdt_xac_minh_luc" THEN
    NEW."sdt_xac_minh_luc" := NULL;
    NEW."sdt_xac_minh_boi_id" := NULL;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER "ho_so_xoa_xac_minh_khi_doi_sdt" BEFORE UPDATE OF "sdt_chuan" ON "thien_khue"."ho_so"
  FOR EACH ROW EXECUTE FUNCTION "thien_khue"."xoa_xac_minh_khi_doi_sdt"();
