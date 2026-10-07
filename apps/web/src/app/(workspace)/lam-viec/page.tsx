"use client";

import { NHAN_VAI, type TrangThaiVai } from "@thien-khue/contracts";
import { Nhan, NutLienKet, The, TheTieuDe, ThongBaoNoiDong, TieuDeTrang } from "@/components/ui";
import { dinhDangNgay } from "@/lib/dinh-dang";
import { useXacThuc } from "@/providers/auth-provider";

const NHAN_TRANG_THAI: Record<TrangThaiVai, string> = {
  DANG_HOC: "Đang học",
  HOAT_DONG: "Hoạt động",
  TAM_DUNG: "Tạm dừng",
  KET_THUC: "Kết thúc"
};

/** Tong quan khong gian lam viec: vai + trang thai kich hoat (agent nen) */
export default function TrangLamViec() {
  const { nguoiDung } = useXacThuc();
  if (!nguoiDung) return null;
  const dangHoc = nguoiDung.vai_chi_tiet.some(v => v.trang_thai === "DANG_HOC");
  return (
    <>
      <TieuDeTrang
        kicker="Không gian làm việc"
        tieuDe={"Xin chào, " + nguoiDung.ho_so.ho_ten}
        moTa="Một hồ sơ gốc, nhiều vai trò — chọn khu vực làm việc ở thanh bên."
      />
      {dangHoc && (
        <ThongBaoNoiDong kieu="canh-bao" className="mb-6">
          Một số vai trò của bạn đang ở trạng thái <strong>Đang học</strong>. Hoàn thành khoá học và đạt bài kiểm tra (từ 90%) để được kích hoạt.{" "}
          <NutLienKet href="/hoc-vien" kieu="vien" co="nho" className="ml-2">
            Vào học
          </NutLienKet>
        </ThongBaoNoiDong>
      )}
      <The>
        <TheTieuDe kicker="Hồ sơ" tieuDe="Vai trò của bạn" />
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {nguoiDung.vai_chi_tiet.map(v => (
            <li key={v.vai} className="flex flex-wrap items-center justify-between gap-3 border-t border-vien pt-3 first:border-0 first:pt-0">
              <span className="font-semibold">{NHAN_VAI[v.vai]}</span>
              <span className="flex items-center gap-3 text-sm text-chu-phu">
                từ {dinhDangNgay(v.tu_luc)}
                <Nhan tong={v.trang_thai === "HOAT_DONG" ? "thanh-cong" : v.trang_thai === "DANG_HOC" ? "canh-bao" : "trung-tinh"}>{NHAN_TRANG_THAI[v.trang_thai]}</Nhan>
              </span>
            </li>
          ))}
        </ul>
      </The>
    </>
  );
}
