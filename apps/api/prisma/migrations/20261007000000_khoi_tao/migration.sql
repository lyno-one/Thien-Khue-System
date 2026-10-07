-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "thien_khue";

-- CreateEnum
CREATE TYPE "thien_khue"."Vai" AS ENUM ('KHACH', 'SALE', 'CSKH', 'CTV', 'THUC_TAP', 'KOL', 'KOC', 'MENTOR', 'DOI_TAC', 'QUAN_LY', 'ADMIN', 'THIEN_KHUE');

-- CreateEnum
CREATE TYPE "thien_khue"."TrangThaiVai" AS ENUM ('DANG_HOC', 'HOAT_DONG', 'TAM_DUNG', 'KET_THUC');

-- CreateEnum
CREATE TYPE "thien_khue"."LoaiKhoaHoc" AS ENUM ('NEN_TANG', 'NGHIEP_VU', 'SAN_PHAM');

-- CreateEnum
CREATE TYPE "thien_khue"."LoaiNoiDungBaiHoc" AS ENUM ('MARKDOWN', 'VIDEO');

-- CreateEnum
CREATE TYPE "thien_khue"."TrangThaiThucHanh" AS ENUM ('CHO_CHAM', 'DAT', 'CHUA_DAT');

-- CreateEnum
CREATE TYPE "thien_khue"."TrangThaiQuyenSku" AS ENUM ('HOAT_DONG', 'CAN_HOC_LAI', 'THU_HOI');

-- CreateEnum
CREATE TYPE "thien_khue"."NguonGiaoKhach" AS ENUM ('TU_DONG', 'THU_CONG', 'LEAD');

-- CreateEnum
CREATE TYPE "thien_khue"."TrangThaiGiaoKhach" AS ENUM ('DANG_PHU_TRACH', 'DA_CHUYEN', 'KET_THUC');

-- CreateEnum
CREATE TYPE "thien_khue"."LoaiLead" AS ENUM ('MUA_HANG', 'DANG_KY_HOC', 'HOP_TAC', 'KHAC');

-- CreateEnum
CREATE TYPE "thien_khue"."TrangThaiLead" AS ENUM ('MOI', 'DA_PHAN_BO', 'DANG_XU_LY', 'THANH_CONG', 'THAT_BAI', 'TRUNG');

-- CreateEnum
CREATE TYPE "thien_khue"."TrangThaiChienDich" AS ENUM ('NHAP', 'DANG_CHAY', 'TAM_DUNG', 'KET_THUC');

-- CreateEnum
CREATE TYPE "thien_khue"."TrangThaiThamGia" AS ENUM ('CHO_DUYET', 'DA_DUYET', 'TU_CHOI', 'HOAN_THANH');

-- CreateEnum
CREATE TYPE "thien_khue"."LoaiNoiDungKoc" AS ENUM ('KICH_BAN', 'VIDEO');

-- CreateEnum
CREATE TYPE "thien_khue"."TrangThaiNoiDung" AS ENUM ('NHAP', 'CHO_DUYET', 'CAN_SUA', 'DA_DUYET', 'TU_CHOI', 'DA_DANG');

-- CreateEnum
CREATE TYPE "thien_khue"."NguonDon" AS ENUM ('SALE', 'CTV', 'KOC', 'KOL');

-- CreateEnum
CREATE TYPE "thien_khue"."TrangThaiGhiNhan" AS ENUM ('HOP_LE', 'CHO_XAC_MINH', 'BI_HUY', 'DA_DOI_SOAT');

-- CreateEnum
CREATE TYPE "thien_khue"."TrangThaiHoaHong" AS ENUM ('CHO_DOI_SOAT', 'DU_DIEU_KIEN', 'DA_TRA', 'BI_TRU');

-- CreateEnum
CREATE TYPE "thien_khue"."HangThanhVien" AS ENUM ('THAN_THIET', 'VIP');

-- CreateEnum
CREATE TYPE "thien_khue"."TrangThaiMoiKh" AS ENUM ('DA_MOI', 'THAM_GIA', 'TU_CHOI', 'DA_GUI_MAU', 'DA_PHAN_HOI', 'ROI_CHUONG_TRINH');

-- CreateEnum
CREATE TYPE "thien_khue"."LoaiDoiTac" AS ENUM ('DOANH_NGHIEP', 'NGAN_HANG', 'TO_CHUC', 'NHA_CUNG_CAP_QUA');

-- CreateEnum
CREATE TYPE "thien_khue"."TrangThaiDuyetQua" AS ENUM ('CHO_THAM_DINH', 'DA_DUYET', 'TU_CHOI');

-- CreateEnum
CREATE TYPE "thien_khue"."LoaiGiam" AS ENUM ('PHAN_TRAM', 'SO_TIEN');

-- CreateEnum
CREATE TYPE "thien_khue"."TrangThaiCapPhat" AS ENUM ('DA_CAP', 'DA_DUNG', 'HET_HAN', 'HUY');

-- CreateEnum
CREATE TYPE "thien_khue"."LoaiHopDong" AS ENUM ('DAT_QUA', 'DONG_THUONG_HIEU', 'TAI_TRO', 'KHAC');

-- CreateEnum
CREATE TYPE "thien_khue"."TrangThaiHopDong" AS ENUM ('NHAP', 'HIEU_LUC', 'KET_THUC', 'HUY');

-- CreateEnum
CREATE TYPE "thien_khue"."LoaiDeXuat" AS ENUM ('CAP_QUYEN_SKU', 'CHUYEN_VAI', 'KICH_HOAT_LAM_VIEC', 'DUYET_QUA_TANG', 'DUYET_VOUCHER', 'XAC_MINH_DON', 'DIEU_CHINH_HOA_HONG', 'CHI_TRA_HOA_HONG', 'DOI_CHINH_SACH', 'XUAT_DU_LIEU_KHACH', 'KHAC');

-- CreateEnum
CREATE TYPE "thien_khue"."TrangThaiDeXuat" AS ENUM ('CHO_KIEM', 'CHO_DUYET', 'DA_DUYET', 'TU_CHOI', 'HUY');

-- CreateEnum
CREATE TYPE "thien_khue"."TacNhan" AS ENUM ('NGUOI', 'HE_THONG', 'AI');

-- CreateEnum
CREATE TYPE "thien_khue"."LoaiThongBao" AS ENUM ('HE_THONG', 'DAO_TAO', 'QUYEN_SKU', 'KHACH_MOI', 'DON_HANG', 'HOA_HONG', 'CHIEN_DICH', 'PHE_DUYET');

-- CreateTable
CREATE TABLE "thien_khue"."ho_so" (
    "id" UUID NOT NULL,
    "ho_ten" TEXT NOT NULL,
    "email" TEXT,
    "sdt" TEXT,
    "sdt_chuan" TEXT,
    "anh_dai_dien" TEXT,
    "crm_user_id" UUID,
    "kich_hoat_lam_viec" BOOLEAN NOT NULL DEFAULT false,
    "kich_hoat_luc" TIMESTAMPTZ(6),
    "ghi_chu" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ho_so_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "thien_khue"."vai_tro_ho_so" (
    "id" UUID NOT NULL,
    "ho_so_id" UUID NOT NULL,
    "vai" "thien_khue"."Vai" NOT NULL,
    "trang_thai" "thien_khue"."TrangThaiVai" NOT NULL DEFAULT 'DANG_HOC',
    "tu_luc" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "den_luc" TIMESTAMPTZ(6),
    "nguon" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vai_tro_ho_so_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "thien_khue"."lich_su_vai_tro" (
    "id" UUID NOT NULL,
    "ho_so_id" UUID NOT NULL,
    "vai" "thien_khue"."Vai" NOT NULL,
    "trang_thai_cu" "thien_khue"."TrangThaiVai",
    "trang_thai_moi" "thien_khue"."TrangThaiVai",
    "nguoi_doi_id" UUID,
    "ly_do" TEXT,
    "de_xuat_duyet_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lich_su_vai_tro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "thien_khue"."khoa_hoc" (
    "id" UUID NOT NULL,
    "ma" TEXT NOT NULL,
    "ten" TEXT NOT NULL,
    "mo_ta" TEXT,
    "loai" "thien_khue"."LoaiKhoaHoc" NOT NULL,
    "vai_ap_dung" "thien_khue"."Vai"[],
    "mau_id" UUID,
    "ma_mau" TEXT,
    "phien_ban_tai_lieu" INTEGER NOT NULL DEFAULT 1,
    "bat_buoc" BOOLEAN NOT NULL DEFAULT true,
    "can_thuc_hanh" BOOLEAN NOT NULL DEFAULT false,
    "yeu_cau_thuc_hanh" TEXT,
    "mau_sac" TEXT,
    "thu_tu" INTEGER NOT NULL DEFAULT 0,
    "bat" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "khoa_hoc_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "thien_khue"."bai_hoc" (
    "id" UUID NOT NULL,
    "khoa_hoc_id" UUID NOT NULL,
    "ma" TEXT NOT NULL,
    "tieu_de" TEXT NOT NULL,
    "chuong" TEXT,
    "loai_noi_dung" "thien_khue"."LoaiNoiDungBaiHoc" NOT NULL DEFAULT 'MARKDOWN',
    "noi_dung" TEXT,
    "video_url" TEXT,
    "tom_tat" TEXT,
    "thoi_luong_phut" INTEGER,
    "thu_tu" INTEGER NOT NULL DEFAULT 0,
    "bat" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bai_hoc_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "thien_khue"."bai_kiem_tra" (
    "id" UUID NOT NULL,
    "khoa_hoc_id" UUID NOT NULL,
    "ma" TEXT NOT NULL,
    "tieu_de" TEXT NOT NULL,
    "nguong_dat" INTEGER NOT NULL DEFAULT 90,
    "bat_buoc" BOOLEAN NOT NULL DEFAULT true,
    "so_cau_hien" INTEGER,
    "thoi_gian_phut" INTEGER,
    "so_lan_toi_da" INTEGER,
    "bat" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bai_kiem_tra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "thien_khue"."cau_hoi" (
    "id" UUID NOT NULL,
    "bai_kiem_tra_id" UUID NOT NULL,
    "ma" TEXT NOT NULL,
    "noi_dung" TEXT NOT NULL,
    "lua_chon" JSONB NOT NULL,
    "dap_an" JSONB NOT NULL,
    "giai_thich" TEXT,
    "diem" INTEGER NOT NULL DEFAULT 1,
    "thu_tu" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cau_hoi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "thien_khue"."luot_lam" (
    "id" UUID NOT NULL,
    "bai_kiem_tra_id" UUID NOT NULL,
    "ho_so_id" UUID NOT NULL,
    "diem" INTEGER NOT NULL DEFAULT 0,
    "so_cau_dung" INTEGER NOT NULL DEFAULT 0,
    "tong_cau" INTEGER NOT NULL DEFAULT 0,
    "dat" BOOLEAN NOT NULL DEFAULT false,
    "tra_loi" JSONB,
    "phien_ban_tai_lieu" INTEGER NOT NULL DEFAULT 1,
    "bat_dau_luc" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nop_luc" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "luot_lam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "thien_khue"."tien_do_bai_hoc" (
    "id" UUID NOT NULL,
    "ho_so_id" UUID NOT NULL,
    "bai_hoc_id" UUID NOT NULL,
    "hoan_thanh_luc" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tien_do_bai_hoc_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "thien_khue"."bai_thuc_hanh" (
    "id" UUID NOT NULL,
    "khoa_hoc_id" UUID NOT NULL,
    "ho_so_id" UUID NOT NULL,
    "vai" "thien_khue"."Vai",
    "tieu_de" TEXT,
    "mo_ta" TEXT,
    "link" TEXT,
    "tep_url" TEXT,
    "trang_thai" "thien_khue"."TrangThaiThucHanh" NOT NULL DEFAULT 'CHO_CHAM',
    "diem" INTEGER,
    "nguoi_cham_id" UUID,
    "nhan_xet" TEXT,
    "cham_luc" TIMESTAMPTZ(6),
    "nop_luc" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bai_thuc_hanh_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "thien_khue"."quyen_sku" (
    "id" UUID NOT NULL,
    "ho_so_id" UUID NOT NULL,
    "mau_id" UUID NOT NULL,
    "ma_mau" TEXT NOT NULL,
    "trang_thai" "thien_khue"."TrangThaiQuyenSku" NOT NULL DEFAULT 'HOAT_DONG',
    "phien_ban_tai_lieu" INTEGER NOT NULL DEFAULT 1,
    "khoa_hoc_id" UUID,
    "cap_luc" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nguoi_cap_id" UUID,
    "thu_hoi_luc" TIMESTAMPTZ(6),
    "ly_do" TEXT,
    "bang_chung" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quyen_sku_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "thien_khue"."chung_chi" (
    "id" UUID NOT NULL,
    "ho_so_id" UUID NOT NULL,
    "khoa_hoc_id" UUID NOT NULL,
    "ma_chung_chi" TEXT NOT NULL,
    "phien_ban_tai_lieu" INTEGER NOT NULL DEFAULT 1,
    "diem" INTEGER,
    "cap_luc" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "het_han_luc" TIMESTAMPTZ(6),
    "thu_hoi_luc" TIMESTAMPTZ(6),
    "bang_chung" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chung_chi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "thien_khue"."ca_truc" (
    "id" UUID NOT NULL,
    "ho_so_id" UUID NOT NULL,
    "ngay" DATE NOT NULL,
    "tu_gio" TEXT NOT NULL,
    "den_gio" TEXT NOT NULL,
    "vai" "thien_khue"."Vai" NOT NULL DEFAULT 'SALE',
    "so_khach_toi_da" INTEGER,
    "ghi_chu" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ca_truc_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "thien_khue"."nang_luc" (
    "id" UUID NOT NULL,
    "ho_so_id" UUID NOT NULL,
    "ma_mau" TEXT,
    "nhom" TEXT,
    "muc" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nang_luc_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "thien_khue"."giao_khach" (
    "id" UUID NOT NULL,
    "sdt_chuan" TEXT NOT NULL,
    "ten_khach" TEXT,
    "ho_so_id" UUID NOT NULL,
    "nguon" "thien_khue"."NguonGiaoKhach" NOT NULL DEFAULT 'TU_DONG',
    "trang_thai" "thien_khue"."TrangThaiGiaoKhach" NOT NULL DEFAULT 'DANG_PHU_TRACH',
    "giao_luc" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ket_thuc_luc" TIMESTAMPTZ(6),
    "ly_do" TEXT,
    "nguoi_giao_id" UUID,
    "ca_truc_id" UUID,
    "lead_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "giao_khach_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "thien_khue"."lead" (
    "id" UUID NOT NULL,
    "ten" TEXT NOT NULL,
    "sdt" TEXT NOT NULL,
    "sdt_chuan" TEXT NOT NULL,
    "email" TEXT,
    "loai" "thien_khue"."LoaiLead" NOT NULL DEFAULT 'MUA_HANG',
    "nhu_cau" TEXT,
    "ma_mau_quan_tam" TEXT,
    "nguon" TEXT,
    "ma_gioi_thieu" TEXT,
    "dong_y_lien_he" BOOLEAN NOT NULL DEFAULT true,
    "trang_thai" "thien_khue"."TrangThaiLead" NOT NULL DEFAULT 'MOI',
    "phan_bo_cho" UUID,
    "phan_bo_luc" TIMESTAMPTZ(6),
    "ghi_chu" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "thien_khue"."ma_gioi_thieu" (
    "id" UUID NOT NULL,
    "ho_so_id" UUID NOT NULL,
    "mau_id" UUID,
    "ma_mau" TEXT,
    "ma" TEXT NOT NULL,
    "chien_dich_id" UUID,
    "bat" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ma_gioi_thieu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "thien_khue"."luot_click" (
    "id" UUID NOT NULL,
    "ma_gioi_thieu_id" UUID NOT NULL,
    "ip_bam" TEXT,
    "user_agent" TEXT,
    "nguon_url" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "luot_click_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "thien_khue"."chien_dich" (
    "id" UUID NOT NULL,
    "ten" TEXT NOT NULL,
    "mo_ta" TEXT,
    "mau_ids" UUID[],
    "ma_maus" TEXT[],
    "vai_ap_dung" "thien_khue"."Vai"[],
    "ngan_sach" DECIMAL(14,0),
    "bat_dau" TIMESTAMPTZ(6),
    "han" TIMESTAMPTZ(6),
    "trang_thai" "thien_khue"."TrangThaiChienDich" NOT NULL DEFAULT 'NHAP',
    "nguoi_tao_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chien_dich_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "thien_khue"."tham_gia_chien_dich" (
    "id" UUID NOT NULL,
    "chien_dich_id" UUID NOT NULL,
    "ho_so_id" UUID NOT NULL,
    "trang_thai" "thien_khue"."TrangThaiThamGia" NOT NULL DEFAULT 'CHO_DUYET',
    "ghi_chu" TEXT,
    "nguoi_duyet_id" UUID,
    "duyet_luc" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tham_gia_chien_dich_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "thien_khue"."noi_dung_koc" (
    "id" UUID NOT NULL,
    "ho_so_id" UUID NOT NULL,
    "chien_dich_id" UUID,
    "mau_id" UUID,
    "ma_mau" TEXT,
    "loai" "thien_khue"."LoaiNoiDungKoc" NOT NULL DEFAULT 'VIDEO',
    "tieu_de" TEXT NOT NULL,
    "kich_ban" TEXT,
    "link_video" TEXT,
    "nen_tang" TEXT,
    "trang_thai" "thien_khue"."TrangThaiNoiDung" NOT NULL DEFAULT 'CHO_DUYET',
    "nguoi_duyet_id" UUID,
    "nhan_xet" TEXT,
    "duyet_luc" TIMESTAMPTZ(6),
    "luot_xem" INTEGER NOT NULL DEFAULT 0,
    "luot_tuong_tac" INTEGER NOT NULL DEFAULT 0,
    "so_lieu_cap_nhat_luc" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "noi_dung_koc_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "thien_khue"."ghi_nhan_don" (
    "id" UUID NOT NULL,
    "crm_don_id" UUID NOT NULL,
    "ma_don" TEXT NOT NULL,
    "sdt_chuan" TEXT,
    "tong_tien" DECIMAL(14,0) NOT NULL DEFAULT 0,
    "nguoi_ban_ho_so_id" UUID,
    "nguon" "thien_khue"."NguonDon" NOT NULL,
    "ma_gioi_thieu" TEXT,
    "ma_gioi_thieu_id" UUID,
    "nguoi_chot_ho_so_id" UUID,
    "trang_thai" "thien_khue"."TrangThaiGhiNhan" NOT NULL DEFAULT 'HOP_LE',
    "ly_do" TEXT,
    "nguoi_xac_minh_id" UUID,
    "xac_minh_luc" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ghi_nhan_don_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "thien_khue"."hoa_hong" (
    "id" UUID NOT NULL,
    "ghi_nhan_don_id" UUID NOT NULL,
    "ho_so_id" UUID NOT NULL,
    "so_tien" DECIMAL(14,0) NOT NULL,
    "ty_le" DECIMAL(5,2),
    "trang_thai" "thien_khue"."TrangThaiHoaHong" NOT NULL DEFAULT 'CHO_DOI_SOAT',
    "ky" TEXT NOT NULL,
    "tra_luc" TIMESTAMPTZ(6),
    "de_xuat_duyet_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hoa_hong_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "thien_khue"."dieu_chinh_hoa_hong" (
    "id" UUID NOT NULL,
    "hoa_hong_id" UUID,
    "ho_so_id" UUID NOT NULL,
    "so_tien" DECIMAL(14,0) NOT NULL,
    "ly_do" TEXT NOT NULL,
    "ky" TEXT NOT NULL,
    "de_xuat_duyet_id" UUID,
    "nguoi_tao_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dieu_chinh_hoa_hong_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "thien_khue"."ty_le_hoa_hong" (
    "id" UUID NOT NULL,
    "vai" "thien_khue"."Vai" NOT NULL,
    "mau_id" UUID,
    "ma_mau" TEXT,
    "ty_le" DECIMAL(5,2) NOT NULL,
    "hieu_luc_tu" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hieu_luc_den" TIMESTAMPTZ(6),
    "bat" BOOLEAN NOT NULL DEFAULT true,
    "ghi_chu" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ty_le_hoa_hong_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "thien_khue"."hang_thanh_vien_cau_hinh" (
    "id" UUID NOT NULL,
    "hang" "thien_khue"."HangThanhVien" NOT NULL,
    "ten" TEXT NOT NULL,
    "nguong_tich_luy" DECIMAL(14,0) NOT NULL,
    "giam_gia_phan_tram" DECIMAL(5,2) NOT NULL,
    "quyen_loi" TEXT,
    "thu_tu" INTEGER NOT NULL DEFAULT 0,
    "bat" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hang_thanh_vien_cau_hinh_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "thien_khue"."moi_kh_hanh_phuc" (
    "id" UUID NOT NULL,
    "sdt_chuan" TEXT NOT NULL,
    "ten_khach" TEXT,
    "so_lan_mua_luc_moi" INTEGER NOT NULL DEFAULT 0,
    "trang_thai" "thien_khue"."TrangThaiMoiKh" NOT NULL DEFAULT 'DA_MOI',
    "dong_y_dung_hinh" BOOLEAN NOT NULL DEFAULT false,
    "dong_y_dung_hinh_luc" TIMESTAMPTZ(6),
    "nguoi_moi_id" UUID,
    "moi_luc" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tra_loi_luc" TIMESTAMPTZ(6),
    "ghi_chu" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "moi_kh_hanh_phuc_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "thien_khue"."phan_hoi_mau_thu" (
    "id" UUID NOT NULL,
    "moi_kh_hanh_phuc_id" UUID NOT NULL,
    "mau_id" UUID,
    "ma_mau" TEXT,
    "diem_size" INTEGER,
    "diem_chat_lieu" INTEGER,
    "diem_kieu_dang" INTEGER,
    "noi_dung" TEXT NOT NULL,
    "hinh_anh" TEXT[],
    "cho_phep_dung_hinh" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "phan_hoi_mau_thu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "thien_khue"."doi_tac" (
    "id" UUID NOT NULL,
    "ten" TEXT NOT NULL,
    "loai" "thien_khue"."LoaiDoiTac" NOT NULL,
    "ma_so_thue" TEXT,
    "nguoi_lien_he" TEXT,
    "sdt" TEXT,
    "email" TEXT,
    "dia_chi" TEXT,
    "ho_so_id" UUID,
    "bat" BOOLEAN NOT NULL DEFAULT true,
    "ghi_chu" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "doi_tac_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "thien_khue"."qua_tang" (
    "id" UUID NOT NULL,
    "doi_tac_id" UUID,
    "ten" TEXT NOT NULL,
    "mo_ta" TEXT,
    "hinh_anh" TEXT,
    "gia_tri" DECIMAL(14,0),
    "so_luong" INTEGER,
    "hang_ap_dung" "thien_khue"."HangThanhVien"[],
    "trang_thai" "thien_khue"."TrangThaiDuyetQua" NOT NULL DEFAULT 'CHO_THAM_DINH',
    "nguoi_de_xuat_id" UUID,
    "nguoi_tham_dinh_id" UUID,
    "ket_qua_tham_dinh" TEXT,
    "nguoi_duyet_id" UUID,
    "duyet_luc" TIMESTAMPTZ(6),
    "ly_do_tu_choi" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "qua_tang_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "thien_khue"."voucher" (
    "id" UUID NOT NULL,
    "ma" TEXT NOT NULL,
    "ten" TEXT NOT NULL,
    "doi_tac_id" UUID,
    "loai_giam" "thien_khue"."LoaiGiam" NOT NULL DEFAULT 'PHAN_TRAM',
    "gia_tri" DECIMAL(14,2) NOT NULL,
    "don_toi_thieu" DECIMAL(14,0),
    "hang_ap_dung" "thien_khue"."HangThanhVien"[],
    "so_luong" INTEGER,
    "da_cap" INTEGER NOT NULL DEFAULT 0,
    "bat_dau" TIMESTAMPTZ(6),
    "het_han" TIMESTAMPTZ(6),
    "trang_thai" "thien_khue"."TrangThaiDuyetQua" NOT NULL DEFAULT 'CHO_THAM_DINH',
    "nguoi_duyet_id" UUID,
    "duyet_luc" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "voucher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "thien_khue"."cap_phat_uu_dai" (
    "id" UUID NOT NULL,
    "sdt_chuan" TEXT NOT NULL,
    "voucher_id" UUID,
    "qua_tang_id" UUID,
    "ly_do" TEXT,
    "trang_thai" "thien_khue"."TrangThaiCapPhat" NOT NULL DEFAULT 'DA_CAP',
    "nguoi_cap_id" UUID,
    "cap_luc" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dung_luc" TIMESTAMPTZ(6),
    "crm_don_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cap_phat_uu_dai_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "thien_khue"."hop_dong_doi_tac" (
    "id" UUID NOT NULL,
    "doi_tac_id" UUID NOT NULL,
    "so_hop_dong" TEXT,
    "ten" TEXT NOT NULL,
    "loai" "thien_khue"."LoaiHopDong" NOT NULL DEFAULT 'DAT_QUA',
    "gia_tri_hop_dong" DECIMAL(14,0),
    "doanh_thu_qua" DECIMAL(14,0) NOT NULL DEFAULT 0,
    "chi_phi_tai_tro" DECIMAL(14,0) NOT NULL DEFAULT 0,
    "ket_qua_chien_dich" JSONB,
    "ket_qua_ghi_chu" TEXT,
    "bat_dau" DATE,
    "ket_thuc" DATE,
    "trang_thai" "thien_khue"."TrangThaiHopDong" NOT NULL DEFAULT 'NHAP',
    "nguoi_phu_trach_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hop_dong_doi_tac_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "thien_khue"."de_xuat_duyet" (
    "id" UUID NOT NULL,
    "loai" "thien_khue"."LoaiDeXuat" NOT NULL,
    "doi_tuong" TEXT NOT NULL,
    "doi_tuong_id" TEXT,
    "du_lieu" JSONB NOT NULL,
    "ly_do" TEXT,
    "nguoi_de_xuat_id" UUID NOT NULL,
    "nguoi_kiem_id" UUID,
    "kiem_luc" TIMESTAMPTZ(6),
    "y_kien_kiem" TEXT,
    "nguoi_duyet_id" UUID,
    "duyet_luc" TIMESTAMPTZ(6),
    "y_kien_duyet" TEXT,
    "trang_thai" "thien_khue"."TrangThaiDeXuat" NOT NULL DEFAULT 'CHO_KIEM',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "de_xuat_duyet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "thien_khue"."nhat_ky" (
    "id" UUID NOT NULL,
    "ho_so_id" UUID,
    "tac_nhan" "thien_khue"."TacNhan" NOT NULL DEFAULT 'NGUOI',
    "hanh_dong" TEXT NOT NULL,
    "doi_tuong" TEXT NOT NULL,
    "doi_tuong_id" TEXT,
    "du_lieu" JSONB,
    "ip" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nhat_ky_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "thien_khue"."thong_bao" (
    "id" UUID NOT NULL,
    "ho_so_id" UUID NOT NULL,
    "loai" "thien_khue"."LoaiThongBao" NOT NULL DEFAULT 'HE_THONG',
    "tieu_de" TEXT NOT NULL,
    "noi_dung" TEXT,
    "lien_ket" TEXT,
    "du_lieu" JSONB,
    "da_doc" BOOLEAN NOT NULL DEFAULT false,
    "doc_luc" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "thong_bao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ho_so_email_key" ON "thien_khue"."ho_so"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ho_so_crm_user_id_key" ON "thien_khue"."ho_so"("crm_user_id");

-- CreateIndex
CREATE INDEX "ho_so_sdt_chuan_idx" ON "thien_khue"."ho_so"("sdt_chuan");

-- CreateIndex
CREATE INDEX "vai_tro_ho_so_vai_trang_thai_idx" ON "thien_khue"."vai_tro_ho_so"("vai", "trang_thai");

-- CreateIndex
CREATE UNIQUE INDEX "vai_tro_ho_so_ho_so_id_vai_key" ON "thien_khue"."vai_tro_ho_so"("ho_so_id", "vai");

-- CreateIndex
CREATE INDEX "lich_su_vai_tro_ho_so_id_created_at_idx" ON "thien_khue"."lich_su_vai_tro"("ho_so_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "khoa_hoc_ma_key" ON "thien_khue"."khoa_hoc"("ma");

-- CreateIndex
CREATE INDEX "khoa_hoc_loai_bat_idx" ON "thien_khue"."khoa_hoc"("loai", "bat");

-- CreateIndex
CREATE INDEX "khoa_hoc_mau_id_idx" ON "thien_khue"."khoa_hoc"("mau_id");

-- CreateIndex
CREATE INDEX "bai_hoc_khoa_hoc_id_thu_tu_idx" ON "thien_khue"."bai_hoc"("khoa_hoc_id", "thu_tu");

-- CreateIndex
CREATE UNIQUE INDEX "bai_hoc_khoa_hoc_id_ma_key" ON "thien_khue"."bai_hoc"("khoa_hoc_id", "ma");

-- CreateIndex
CREATE UNIQUE INDEX "bai_kiem_tra_ma_key" ON "thien_khue"."bai_kiem_tra"("ma");

-- CreateIndex
CREATE INDEX "bai_kiem_tra_khoa_hoc_id_idx" ON "thien_khue"."bai_kiem_tra"("khoa_hoc_id");

-- CreateIndex
CREATE INDEX "cau_hoi_bai_kiem_tra_id_thu_tu_idx" ON "thien_khue"."cau_hoi"("bai_kiem_tra_id", "thu_tu");

-- CreateIndex
CREATE UNIQUE INDEX "cau_hoi_bai_kiem_tra_id_ma_key" ON "thien_khue"."cau_hoi"("bai_kiem_tra_id", "ma");

-- CreateIndex
CREATE INDEX "luot_lam_ho_so_id_bai_kiem_tra_id_created_at_idx" ON "thien_khue"."luot_lam"("ho_so_id", "bai_kiem_tra_id", "created_at");

-- CreateIndex
CREATE INDEX "tien_do_bai_hoc_bai_hoc_id_idx" ON "thien_khue"."tien_do_bai_hoc"("bai_hoc_id");

-- CreateIndex
CREATE UNIQUE INDEX "tien_do_bai_hoc_ho_so_id_bai_hoc_id_key" ON "thien_khue"."tien_do_bai_hoc"("ho_so_id", "bai_hoc_id");

-- CreateIndex
CREATE INDEX "bai_thuc_hanh_ho_so_id_khoa_hoc_id_idx" ON "thien_khue"."bai_thuc_hanh"("ho_so_id", "khoa_hoc_id");

-- CreateIndex
CREATE INDEX "bai_thuc_hanh_trang_thai_nop_luc_idx" ON "thien_khue"."bai_thuc_hanh"("trang_thai", "nop_luc");

-- CreateIndex
CREATE INDEX "quyen_sku_mau_id_trang_thai_idx" ON "thien_khue"."quyen_sku"("mau_id", "trang_thai");

-- CreateIndex
CREATE UNIQUE INDEX "quyen_sku_ho_so_id_mau_id_key" ON "thien_khue"."quyen_sku"("ho_so_id", "mau_id");

-- CreateIndex
CREATE UNIQUE INDEX "chung_chi_ma_chung_chi_key" ON "thien_khue"."chung_chi"("ma_chung_chi");

-- CreateIndex
CREATE UNIQUE INDEX "chung_chi_ho_so_id_khoa_hoc_id_key" ON "thien_khue"."chung_chi"("ho_so_id", "khoa_hoc_id");

-- CreateIndex
CREATE INDEX "ca_truc_ngay_idx" ON "thien_khue"."ca_truc"("ngay");

-- CreateIndex
CREATE UNIQUE INDEX "ca_truc_ho_so_id_ngay_tu_gio_key" ON "thien_khue"."ca_truc"("ho_so_id", "ngay", "tu_gio");

-- CreateIndex
CREATE INDEX "nang_luc_ho_so_id_idx" ON "thien_khue"."nang_luc"("ho_so_id");

-- CreateIndex
CREATE INDEX "nang_luc_ma_mau_idx" ON "thien_khue"."nang_luc"("ma_mau");

-- CreateIndex
CREATE INDEX "nang_luc_nhom_idx" ON "thien_khue"."nang_luc"("nhom");

-- CreateIndex
CREATE INDEX "giao_khach_sdt_chuan_trang_thai_idx" ON "thien_khue"."giao_khach"("sdt_chuan", "trang_thai");

-- CreateIndex
CREATE INDEX "giao_khach_ho_so_id_trang_thai_idx" ON "thien_khue"."giao_khach"("ho_so_id", "trang_thai");

-- CreateIndex
CREATE INDEX "lead_sdt_chuan_idx" ON "thien_khue"."lead"("sdt_chuan");

-- CreateIndex
CREATE INDEX "lead_trang_thai_created_at_idx" ON "thien_khue"."lead"("trang_thai", "created_at");

-- CreateIndex
CREATE INDEX "lead_phan_bo_cho_idx" ON "thien_khue"."lead"("phan_bo_cho");

-- CreateIndex
CREATE UNIQUE INDEX "ma_gioi_thieu_ma_key" ON "thien_khue"."ma_gioi_thieu"("ma");

-- CreateIndex
CREATE INDEX "ma_gioi_thieu_ho_so_id_idx" ON "thien_khue"."ma_gioi_thieu"("ho_so_id");

-- CreateIndex
CREATE INDEX "ma_gioi_thieu_mau_id_idx" ON "thien_khue"."ma_gioi_thieu"("mau_id");

-- CreateIndex
CREATE INDEX "luot_click_ma_gioi_thieu_id_created_at_idx" ON "thien_khue"."luot_click"("ma_gioi_thieu_id", "created_at");

-- CreateIndex
CREATE INDEX "chien_dich_trang_thai_han_idx" ON "thien_khue"."chien_dich"("trang_thai", "han");

-- CreateIndex
CREATE INDEX "tham_gia_chien_dich_ho_so_id_idx" ON "thien_khue"."tham_gia_chien_dich"("ho_so_id");

-- CreateIndex
CREATE UNIQUE INDEX "tham_gia_chien_dich_chien_dich_id_ho_so_id_key" ON "thien_khue"."tham_gia_chien_dich"("chien_dich_id", "ho_so_id");

-- CreateIndex
CREATE INDEX "noi_dung_koc_ho_so_id_trang_thai_idx" ON "thien_khue"."noi_dung_koc"("ho_so_id", "trang_thai");

-- CreateIndex
CREATE INDEX "noi_dung_koc_chien_dich_id_idx" ON "thien_khue"."noi_dung_koc"("chien_dich_id");

-- CreateIndex
CREATE INDEX "noi_dung_koc_trang_thai_created_at_idx" ON "thien_khue"."noi_dung_koc"("trang_thai", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "ghi_nhan_don_crm_don_id_key" ON "thien_khue"."ghi_nhan_don"("crm_don_id");

-- CreateIndex
CREATE INDEX "ghi_nhan_don_nguoi_ban_ho_so_id_trang_thai_idx" ON "thien_khue"."ghi_nhan_don"("nguoi_ban_ho_so_id", "trang_thai");

-- CreateIndex
CREATE INDEX "ghi_nhan_don_trang_thai_created_at_idx" ON "thien_khue"."ghi_nhan_don"("trang_thai", "created_at");

-- CreateIndex
CREATE INDEX "ghi_nhan_don_sdt_chuan_idx" ON "thien_khue"."ghi_nhan_don"("sdt_chuan");

-- CreateIndex
CREATE UNIQUE INDEX "hoa_hong_ghi_nhan_don_id_key" ON "thien_khue"."hoa_hong"("ghi_nhan_don_id");

-- CreateIndex
CREATE INDEX "hoa_hong_ho_so_id_ky_trang_thai_idx" ON "thien_khue"."hoa_hong"("ho_so_id", "ky", "trang_thai");

-- CreateIndex
CREATE INDEX "dieu_chinh_hoa_hong_ho_so_id_ky_idx" ON "thien_khue"."dieu_chinh_hoa_hong"("ho_so_id", "ky");

-- CreateIndex
CREATE INDEX "ty_le_hoa_hong_vai_mau_id_bat_idx" ON "thien_khue"."ty_le_hoa_hong"("vai", "mau_id", "bat");

-- CreateIndex
CREATE UNIQUE INDEX "hang_thanh_vien_cau_hinh_hang_key" ON "thien_khue"."hang_thanh_vien_cau_hinh"("hang");

-- CreateIndex
CREATE INDEX "moi_kh_hanh_phuc_sdt_chuan_idx" ON "thien_khue"."moi_kh_hanh_phuc"("sdt_chuan");

-- CreateIndex
CREATE INDEX "moi_kh_hanh_phuc_trang_thai_idx" ON "thien_khue"."moi_kh_hanh_phuc"("trang_thai");

-- CreateIndex
CREATE INDEX "phan_hoi_mau_thu_moi_kh_hanh_phuc_id_idx" ON "thien_khue"."phan_hoi_mau_thu"("moi_kh_hanh_phuc_id");

-- CreateIndex
CREATE INDEX "phan_hoi_mau_thu_mau_id_idx" ON "thien_khue"."phan_hoi_mau_thu"("mau_id");

-- CreateIndex
CREATE INDEX "doi_tac_loai_bat_idx" ON "thien_khue"."doi_tac"("loai", "bat");

-- CreateIndex
CREATE INDEX "qua_tang_trang_thai_idx" ON "thien_khue"."qua_tang"("trang_thai");

-- CreateIndex
CREATE INDEX "qua_tang_doi_tac_id_idx" ON "thien_khue"."qua_tang"("doi_tac_id");

-- CreateIndex
CREATE UNIQUE INDEX "voucher_ma_key" ON "thien_khue"."voucher"("ma");

-- CreateIndex
CREATE INDEX "voucher_trang_thai_het_han_idx" ON "thien_khue"."voucher"("trang_thai", "het_han");

-- CreateIndex
CREATE INDEX "cap_phat_uu_dai_sdt_chuan_trang_thai_idx" ON "thien_khue"."cap_phat_uu_dai"("sdt_chuan", "trang_thai");

-- CreateIndex
CREATE UNIQUE INDEX "hop_dong_doi_tac_so_hop_dong_key" ON "thien_khue"."hop_dong_doi_tac"("so_hop_dong");

-- CreateIndex
CREATE INDEX "hop_dong_doi_tac_doi_tac_id_trang_thai_idx" ON "thien_khue"."hop_dong_doi_tac"("doi_tac_id", "trang_thai");

-- CreateIndex
CREATE INDEX "de_xuat_duyet_trang_thai_loai_created_at_idx" ON "thien_khue"."de_xuat_duyet"("trang_thai", "loai", "created_at");

-- CreateIndex
CREATE INDEX "de_xuat_duyet_doi_tuong_doi_tuong_id_idx" ON "thien_khue"."de_xuat_duyet"("doi_tuong", "doi_tuong_id");

-- CreateIndex
CREATE INDEX "de_xuat_duyet_nguoi_de_xuat_id_idx" ON "thien_khue"."de_xuat_duyet"("nguoi_de_xuat_id");

-- CreateIndex
CREATE INDEX "nhat_ky_doi_tuong_doi_tuong_id_idx" ON "thien_khue"."nhat_ky"("doi_tuong", "doi_tuong_id");

-- CreateIndex
CREATE INDEX "nhat_ky_ho_so_id_created_at_idx" ON "thien_khue"."nhat_ky"("ho_so_id", "created_at");

-- CreateIndex
CREATE INDEX "nhat_ky_created_at_idx" ON "thien_khue"."nhat_ky"("created_at");

-- CreateIndex
CREATE INDEX "thong_bao_ho_so_id_da_doc_created_at_idx" ON "thien_khue"."thong_bao"("ho_so_id", "da_doc", "created_at");

-- AddForeignKey
ALTER TABLE "thien_khue"."vai_tro_ho_so" ADD CONSTRAINT "vai_tro_ho_so_ho_so_id_fkey" FOREIGN KEY ("ho_so_id") REFERENCES "thien_khue"."ho_so"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thien_khue"."lich_su_vai_tro" ADD CONSTRAINT "lich_su_vai_tro_ho_so_id_fkey" FOREIGN KEY ("ho_so_id") REFERENCES "thien_khue"."ho_so"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thien_khue"."bai_hoc" ADD CONSTRAINT "bai_hoc_khoa_hoc_id_fkey" FOREIGN KEY ("khoa_hoc_id") REFERENCES "thien_khue"."khoa_hoc"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thien_khue"."bai_kiem_tra" ADD CONSTRAINT "bai_kiem_tra_khoa_hoc_id_fkey" FOREIGN KEY ("khoa_hoc_id") REFERENCES "thien_khue"."khoa_hoc"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thien_khue"."cau_hoi" ADD CONSTRAINT "cau_hoi_bai_kiem_tra_id_fkey" FOREIGN KEY ("bai_kiem_tra_id") REFERENCES "thien_khue"."bai_kiem_tra"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thien_khue"."luot_lam" ADD CONSTRAINT "luot_lam_bai_kiem_tra_id_fkey" FOREIGN KEY ("bai_kiem_tra_id") REFERENCES "thien_khue"."bai_kiem_tra"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thien_khue"."luot_lam" ADD CONSTRAINT "luot_lam_ho_so_id_fkey" FOREIGN KEY ("ho_so_id") REFERENCES "thien_khue"."ho_so"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thien_khue"."tien_do_bai_hoc" ADD CONSTRAINT "tien_do_bai_hoc_ho_so_id_fkey" FOREIGN KEY ("ho_so_id") REFERENCES "thien_khue"."ho_so"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thien_khue"."tien_do_bai_hoc" ADD CONSTRAINT "tien_do_bai_hoc_bai_hoc_id_fkey" FOREIGN KEY ("bai_hoc_id") REFERENCES "thien_khue"."bai_hoc"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thien_khue"."bai_thuc_hanh" ADD CONSTRAINT "bai_thuc_hanh_khoa_hoc_id_fkey" FOREIGN KEY ("khoa_hoc_id") REFERENCES "thien_khue"."khoa_hoc"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thien_khue"."bai_thuc_hanh" ADD CONSTRAINT "bai_thuc_hanh_ho_so_id_fkey" FOREIGN KEY ("ho_so_id") REFERENCES "thien_khue"."ho_so"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thien_khue"."quyen_sku" ADD CONSTRAINT "quyen_sku_ho_so_id_fkey" FOREIGN KEY ("ho_so_id") REFERENCES "thien_khue"."ho_so"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thien_khue"."quyen_sku" ADD CONSTRAINT "quyen_sku_khoa_hoc_id_fkey" FOREIGN KEY ("khoa_hoc_id") REFERENCES "thien_khue"."khoa_hoc"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thien_khue"."chung_chi" ADD CONSTRAINT "chung_chi_ho_so_id_fkey" FOREIGN KEY ("ho_so_id") REFERENCES "thien_khue"."ho_so"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thien_khue"."chung_chi" ADD CONSTRAINT "chung_chi_khoa_hoc_id_fkey" FOREIGN KEY ("khoa_hoc_id") REFERENCES "thien_khue"."khoa_hoc"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thien_khue"."ca_truc" ADD CONSTRAINT "ca_truc_ho_so_id_fkey" FOREIGN KEY ("ho_so_id") REFERENCES "thien_khue"."ho_so"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thien_khue"."nang_luc" ADD CONSTRAINT "nang_luc_ho_so_id_fkey" FOREIGN KEY ("ho_so_id") REFERENCES "thien_khue"."ho_so"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thien_khue"."giao_khach" ADD CONSTRAINT "giao_khach_ho_so_id_fkey" FOREIGN KEY ("ho_so_id") REFERENCES "thien_khue"."ho_so"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thien_khue"."giao_khach" ADD CONSTRAINT "giao_khach_ca_truc_id_fkey" FOREIGN KEY ("ca_truc_id") REFERENCES "thien_khue"."ca_truc"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thien_khue"."giao_khach" ADD CONSTRAINT "giao_khach_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "thien_khue"."lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thien_khue"."ma_gioi_thieu" ADD CONSTRAINT "ma_gioi_thieu_ho_so_id_fkey" FOREIGN KEY ("ho_so_id") REFERENCES "thien_khue"."ho_so"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thien_khue"."ma_gioi_thieu" ADD CONSTRAINT "ma_gioi_thieu_chien_dich_id_fkey" FOREIGN KEY ("chien_dich_id") REFERENCES "thien_khue"."chien_dich"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thien_khue"."luot_click" ADD CONSTRAINT "luot_click_ma_gioi_thieu_id_fkey" FOREIGN KEY ("ma_gioi_thieu_id") REFERENCES "thien_khue"."ma_gioi_thieu"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thien_khue"."tham_gia_chien_dich" ADD CONSTRAINT "tham_gia_chien_dich_chien_dich_id_fkey" FOREIGN KEY ("chien_dich_id") REFERENCES "thien_khue"."chien_dich"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thien_khue"."tham_gia_chien_dich" ADD CONSTRAINT "tham_gia_chien_dich_ho_so_id_fkey" FOREIGN KEY ("ho_so_id") REFERENCES "thien_khue"."ho_so"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thien_khue"."noi_dung_koc" ADD CONSTRAINT "noi_dung_koc_ho_so_id_fkey" FOREIGN KEY ("ho_so_id") REFERENCES "thien_khue"."ho_so"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thien_khue"."noi_dung_koc" ADD CONSTRAINT "noi_dung_koc_chien_dich_id_fkey" FOREIGN KEY ("chien_dich_id") REFERENCES "thien_khue"."chien_dich"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thien_khue"."hoa_hong" ADD CONSTRAINT "hoa_hong_ghi_nhan_don_id_fkey" FOREIGN KEY ("ghi_nhan_don_id") REFERENCES "thien_khue"."ghi_nhan_don"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thien_khue"."hoa_hong" ADD CONSTRAINT "hoa_hong_ho_so_id_fkey" FOREIGN KEY ("ho_so_id") REFERENCES "thien_khue"."ho_so"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thien_khue"."dieu_chinh_hoa_hong" ADD CONSTRAINT "dieu_chinh_hoa_hong_hoa_hong_id_fkey" FOREIGN KEY ("hoa_hong_id") REFERENCES "thien_khue"."hoa_hong"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thien_khue"."dieu_chinh_hoa_hong" ADD CONSTRAINT "dieu_chinh_hoa_hong_ho_so_id_fkey" FOREIGN KEY ("ho_so_id") REFERENCES "thien_khue"."ho_so"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thien_khue"."phan_hoi_mau_thu" ADD CONSTRAINT "phan_hoi_mau_thu_moi_kh_hanh_phuc_id_fkey" FOREIGN KEY ("moi_kh_hanh_phuc_id") REFERENCES "thien_khue"."moi_kh_hanh_phuc"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thien_khue"."qua_tang" ADD CONSTRAINT "qua_tang_doi_tac_id_fkey" FOREIGN KEY ("doi_tac_id") REFERENCES "thien_khue"."doi_tac"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thien_khue"."voucher" ADD CONSTRAINT "voucher_doi_tac_id_fkey" FOREIGN KEY ("doi_tac_id") REFERENCES "thien_khue"."doi_tac"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thien_khue"."cap_phat_uu_dai" ADD CONSTRAINT "cap_phat_uu_dai_voucher_id_fkey" FOREIGN KEY ("voucher_id") REFERENCES "thien_khue"."voucher"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thien_khue"."cap_phat_uu_dai" ADD CONSTRAINT "cap_phat_uu_dai_qua_tang_id_fkey" FOREIGN KEY ("qua_tang_id") REFERENCES "thien_khue"."qua_tang"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thien_khue"."hop_dong_doi_tac" ADD CONSTRAINT "hop_dong_doi_tac_doi_tac_id_fkey" FOREIGN KEY ("doi_tac_id") REFERENCES "thien_khue"."doi_tac"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thien_khue"."thong_bao" ADD CONSTRAINT "thong_bao_ho_so_id_fkey" FOREIGN KEY ("ho_so_id") REFERENCES "thien_khue"."ho_so"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- =====================================================================================
-- Phan viet tay (Prisma khong quan ly trigger / CHECK — migrate diff ve sau khong dung toi)
-- =====================================================================================

-- Schema rieng khong mo cho anon / authenticated (PostgREST): chi Nest (postgres) truy cap
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON SCHEMA "thien_khue" FROM anon';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE ALL ON SCHEMA "thien_khue" FROM authenticated';
  END IF;
END $$;

-- Bang chi INSERT: lich su vai tro + nhat ky (bang chung kiem toan, khong sua / xoa)
CREATE OR REPLACE FUNCTION "thien_khue"."chan_sua_xoa"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Bang %.% chi duoc INSERT', TG_TABLE_SCHEMA, TG_TABLE_NAME USING ERRCODE = 'P0001';
END $$;

CREATE TRIGGER "lich_su_vai_tro_chi_insert" BEFORE UPDATE OR DELETE ON "thien_khue"."lich_su_vai_tro"
  FOR EACH ROW EXECUTE FUNCTION "thien_khue"."chan_sua_xoa"();
CREATE TRIGGER "nhat_ky_chi_insert" BEFORE UPDATE OR DELETE ON "thien_khue"."nhat_ky"
  FOR EACH ROW EXECUTE FUNCTION "thien_khue"."chan_sua_xoa"();

-- Maker-checker: nguoi de xuat / kiem / duyet la ba nguoi khac nhau
ALTER TABLE "thien_khue"."de_xuat_duyet"
  ADD CONSTRAINT "de_xuat_duyet_kiem_khac_de_xuat" CHECK ("nguoi_kiem_id" IS NULL OR "nguoi_kiem_id" <> "nguoi_de_xuat_id"),
  ADD CONSTRAINT "de_xuat_duyet_duyet_khac_hai_nguoi" CHECK (
    "nguoi_duyet_id" IS NULL OR ("nguoi_duyet_id" <> "nguoi_de_xuat_id" AND "nguoi_duyet_id" IS DISTINCT FROM "nguoi_kiem_id")
  );

-- Mien gia tri
ALTER TABLE "thien_khue"."bai_kiem_tra" ADD CONSTRAINT "bai_kiem_tra_nguong_dat" CHECK ("nguong_dat" BETWEEN 0 AND 100);
ALTER TABLE "thien_khue"."luot_lam" ADD CONSTRAINT "luot_lam_diem" CHECK ("diem" BETWEEN 0 AND 100);
ALTER TABLE "thien_khue"."nang_luc" ADD CONSTRAINT "nang_luc_muc" CHECK ("muc" BETWEEN 1 AND 5);
ALTER TABLE "thien_khue"."ty_le_hoa_hong" ADD CONSTRAINT "ty_le_hoa_hong_ty_le" CHECK ("ty_le" >= 0 AND "ty_le" <= 100);
ALTER TABLE "thien_khue"."hoa_hong" ADD CONSTRAINT "hoa_hong_so_tien" CHECK ("so_tien" >= 0);
ALTER TABLE "thien_khue"."cap_phat_uu_dai" ADD CONSTRAINT "cap_phat_mot_loai" CHECK (("voucher_id" IS NOT NULL) OR ("qua_tang_id" IS NOT NULL));
