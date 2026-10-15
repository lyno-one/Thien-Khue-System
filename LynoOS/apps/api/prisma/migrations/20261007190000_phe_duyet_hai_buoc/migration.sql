-- Gon phe duyet (07/10): chi TIEN + du lieu khach giu 3 buoc (de xuat -> kiem -> duyet).
-- Moi loai con lai la 2 buoc (de xuat -> duyet): de xuat dang CHO_KIEM cua cac loai nay chuyen thang sang CHO_DUYET.
-- Chi schema thien_khue. Idempotent (chay lai khong doi gi). Code van coi 2 buoc + CHO_KIEM la cho duyet (du lieu module khac tao).
UPDATE "thien_khue"."de_xuat_duyet"
SET "trang_thai" = 'CHO_DUYET', "updated_at" = CURRENT_TIMESTAMP
WHERE "trang_thai" = 'CHO_KIEM'
  AND "loai" NOT IN ('CHI_TRA_HOA_HONG', 'DIEU_CHINH_HOA_HONG', 'XAC_MINH_DON', 'XUAT_DU_LIEU_KHACH');
