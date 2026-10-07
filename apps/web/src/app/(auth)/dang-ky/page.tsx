import { Suspense } from "react";
import { DangTai } from "@/components/ui";
import { FormDangKy } from "@/features/ho-so/form-dang-ky";

export const metadata = {
  title: "Liên hệ tham gia",
  description: "Gửi thông tin tham gia làm CTV, KOL, KOC, thực tập sinh hoặc đối tác — nhân viên Lyno gọi lại và tạo tài khoản cho bạn."
};

/** Lien he tham gia (khong tu tao tai khoan) — ?vai=CTV|KOL|KOC|THUC_TAP|DOI_TAC de chon san vai */
export default function TrangDangKy() {
  return (
    <Suspense fallback={<DangTai />}>
      <FormDangKy />
    </Suspense>
  );
}
