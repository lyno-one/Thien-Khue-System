"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { lopKicker, lopLienKet, Nut, ONhap, ThongBaoNoiDong } from "@/components/ui";
import { thongDiepLoi } from "@/lib/api";
import { useXacThuc } from "@/providers/auth-provider";

/** Chi cho phep chuyen tiep noi bo (chong open redirect) */
function duongTiep(v: string | null): string {
  return v && v.startsWith("/") && !v.startsWith("//") ? v : "/lam-viec";
}

export function FormDangNhap() {
  const { dangNhap, phien, nguoiDung, dangTai } = useXacThuc();
  const router = useRouter();
  const thamSo = useSearchParams();
  const tiep = duongTiep(thamSo.get("tiep"));
  const [email, setEmail] = useState(thamSo.get("email") ?? "");
  const [matKhau, setMatKhau] = useState("");
  const [dangGui, setDangGui] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);

  // Da dang nhap san -> chuyen tiep luon
  useEffect(() => {
    if (!dangTai && phien && nguoiDung) router.replace(tiep);
  }, [dangTai, phien, nguoiDung, tiep, router]);

  async function gui(e: React.FormEvent) {
    e.preventDefault();
    setLoi(null);
    setDangGui(true);
    try {
      const nd = await dangNhap(email, matKhau);
      if (!nd) throw new Error("Đăng nhập được nhưng không tải được hồ sơ — thử lại sau");
      router.replace(tiep);
    } catch (err) {
      setLoi(thongDiepLoi(err));
    } finally {
      setDangGui(false);
    }
  }

  return (
    <div className="tk-up w-full max-w-[400px] rounded-xl border border-vien bg-be-mat p-6 shadow-sm sm:p-8">
      <span className={lopKicker}>LynoOS</span>
      <h1 className="mb-1 mt-1 text-h1 text-chu">Đăng nhập</h1>
      <p className="mb-6 mt-0 text-sm text-chu-phu">Dùng tài khoản Lyno của bạn để vào học viện và không gian làm việc.</p>
      <form onSubmit={gui} className="flex flex-col gap-4" noValidate>
        <ONhap nhan="Email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} batBuoc placeholder="ten@lyno.vn" />
        <ONhap nhan="Mật khẩu" type="password" autoComplete="current-password" value={matKhau} onChange={e => setMatKhau(e.target.value)} batBuoc />
        {loi && <ThongBaoNoiDong kieu="loi">{loi}</ThongBaoNoiDong>}
        <Nut type="submit" co="lon" rongHet dangXuLy={dangGui} disabled={!email || !matKhau}>
          Đăng nhập
        </Nut>
      </form>
      <p className="mb-0 mt-6 text-center text-sm text-chu-phu">
        Chưa có tài khoản? Tài khoản do Lyno cấp —{" "}
        <Link href="/dang-ky" className={lopLienKet}>
          gửi thông tin tham gia
        </Link>
      </p>
    </div>
  );
}
