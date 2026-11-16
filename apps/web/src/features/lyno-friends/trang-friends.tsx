"use client";

import { useEffect, useState } from "react";
import { api, thongDiepLoi } from "@/lib/api";
import { dangNhapEmail, laySupabase } from "@/lib/supabase";

type DieuKien = { enrolled: boolean; ready: boolean; products: { code: string }[]; courses: { id: string; name: string; code: string | null; completed: boolean; progress: number; score: number | null; type: string }[] };

export function TrangLynoFriends() {
  const [dk, setDk] = useState<DieuKien | null>(null);
  const [daDangNhap, setDaDangNhap] = useState(false);
  const [dangTai, setDangTai] = useState(true);
  const [dangGui, setDangGui] = useState(false);
  const [dangKyMoi, setDangKyMoi] = useState(true);
  const [dongY, setDongY] = useState(false);
  const [email, setEmail] = useState("");
  const [matKhau, setMatKhau] = useState("");
  const [ten, setTen] = useState("");
  const [sdt, setSdt] = useState("");
  const [loi, setLoi] = useState("");
  const [thongBao, setThongBao] = useState("");
  const [maMuonHoc, setMaMuonHoc] = useState<string[]>([]);
  const [canDatMatKhau, setCanDatMatKhau] = useState(false);

  async function tai() {
    const { data } = await laySupabase().auth.getSession();
    setDaDangNhap(!!data.session);
    if (data.session) setDk(await api.get<DieuKien>("/lyno-friends/dieu-kien"));
  }
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    setMaMuonHoc((q.get("ma") || "").toUpperCase().split(",").filter(Boolean));
    const mo = async () => {
      // Xac nhan email Supabase implicit flow. Token khong bao gio vao URL Affi.
      const hash = new URLSearchParams(window.location.hash.slice(1));
      if (hash.get("access_token") && hash.get("refresh_token")) {
        const { error } = await laySupabase().auth.setSession({ access_token: hash.get("access_token")!, refresh_token: hash.get("refresh_token")! });
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
        if (error) throw new Error("Link xác nhận đã hết hạn, vui lòng đăng nhập lại");
        if (hash.get("type") === "invite") setCanDatMatKhau(true);
      }
      await tai();
    };
    mo().catch(e => setLoi(thongDiepLoi(e))).finally(() => setDangTai(false));
  }, []);

  async function xacThuc(e: React.FormEvent) {
    e.preventDefault(); setDangGui(true); setLoi(""); setThongBao("");
    try {
      if (dangKyMoi) {
        const r = await api.post<{ message: string }>("/lyno-friends/tai-khoan", { email: email.trim(), ho_ten: ten.trim(), dong_y: dongY }, { congKhai: true });
        setThongBao(r.message); return;
      } else await dangNhapEmail(email, matKhau);
      await tai();
    } catch (e) { setLoi(thongDiepLoi(e)); }
    finally { setDangGui(false); }
  }
  async function dangKyHoc() {
    setDangGui(true); setLoi("");
    try {
      if (!dongY) throw new Error("Vui lòng xác nhận tự nguyện tham gia");
      if (canDatMatKhau) {
        if (matKhau.length < 8) throw new Error("Đặt mật khẩu từ 8 ký tự để đăng nhập lần sau");
        const { error } = await laySupabase().auth.updateUser({ password: matKhau });
        if (error) throw new Error("Chưa đặt được mật khẩu, vui lòng thử lại");
        setCanDatMatKhau(false);
      }
      if (!/^0[35789]\d{8}$/.test(sdt.replace(/[\s.-]/g, ""))) throw new Error("Nhập số điện thoại di động Việt Nam gồm 10 số");
      await api.patch("/ho-so/toi", { ...(ten.trim() ? { ho_ten: ten.trim() } : {}), sdt });
      setDk(await api.post<DieuKien>("/lyno-friends/dang-ky", { dong_y: true }));
      setThongBao("Đã đăng ký học. Hoàn tất bài học và thi đạt từ 90% để nhận quyền Affi theo từng mã.");
    } catch (e) { setLoi(thongDiepLoi(e)); }
    finally { setDangGui(false); }
  }
  async function moAffi() {
    setDangGui(true); setLoi("");
    try { const r = await api.post<{ url: string }>("/lyno-friends/mo-affi"); window.location.assign(r.url); }
    catch (e) { setLoi(thongDiepLoi(e)); setDangGui(false); }
  }
  const o = "w-full rounded-lg border border-stone-300 bg-white p-3 text-stone-900";
  const nut = "rounded-lg bg-stone-900 px-5 py-3 text-white disabled:opacity-50";
  const khoa = [...(dk?.courses || [])].sort((a, b) => Number(maMuonHoc.includes(b.code || "")) - Number(maMuonHoc.includes(a.code || "")));
  return <div className="mx-auto w-full min-w-0 max-w-3xl space-y-6 px-5 py-12">
    <div><p className="text-sm tracking-widest text-stone-500">LYNO FRIENDS</p><h1 className="text-3xl font-semibold">Mặc đẹp, hiểu sản phẩm, chia sẻ cùng LYNO</h1><p className="mt-4 text-stone-600">Sau khi mua hàng, chị có thể tự nguyện tham gia và học miễn phí. Học hết bài, thi đạt từ 90% cho mã nào thì nhận tài khoản Affi và link giới thiệu của đúng mã đó.</p></div>
    <ol className="grid gap-3 rounded-xl bg-stone-100 p-5 sm:grid-cols-3"><li>1. Đăng ký học</li><li>2. Học và thi đạt 90%</li><li>3. Mở Affi, lấy link mã đã đạt</li></ol>
    {loi && <p role="alert" className="rounded-lg bg-red-50 p-4 text-red-800">{loi}</p>}
    {thongBao && <p role="status" className="rounded-lg bg-green-50 p-4 text-green-800">{thongBao}</p>}
    {dangTai ? <p>Đang kiểm tra tài khoản…</p> : !daDangNhap ? <form onSubmit={xacThuc} className="space-y-4 rounded-xl border p-6">
      <h2 className="text-xl font-semibold">{dangKyMoi ? "Tạo tài khoản học" : "Đăng nhập tài khoản học"}</h2>
      <p className="text-sm text-stone-600">Tài khoản học giúp lưu tiến độ. Quyền Affi chỉ mở sau khi đạt điều kiện đào tạo.</p>
      {dangKyMoi && <label className="block">Họ tên<input className={o} value={ten} onChange={e => setTen(e.target.value)} required minLength={2} maxLength={120} autoComplete="name" /></label>}
      <label className="block">Email<input className={o} type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required /></label>
      {!dangKyMoi && <label className="block">Mật khẩu<input className={o} type="password" autoComplete="current-password" minLength={8} value={matKhau} onChange={e => setMatKhau(e.target.value)} required /></label>}
      {dangKyMoi && <label className="flex gap-3"><input type="checkbox" checked={dongY} onChange={e => setDongY(e.target.checked)} required />Tôi muốn tạo tài khoản học LYNO Friends và nhận email xác nhận.</label>}
      <button className={nut} disabled={dangGui}>{dangGui ? "Đang xử lý…" : dangKyMoi ? "Gửi email xác nhận" : "Đăng nhập"}</button>
      <button type="button" className="ml-4 underline" onClick={() => setDangKyMoi(!dangKyMoi)}>{dangKyMoi ? "Đã có tài khoản? Đăng nhập" : "Chưa có tài khoản? Đăng ký"}</button>
    </form> : !dk?.enrolled ? <section className="space-y-4 rounded-xl border p-6">
      <h2 className="text-xl font-semibold">Đăng ký học LYNO Friends</h2>
      <label className="block">Họ tên<input className={o} value={ten} onChange={e => setTen(e.target.value)} maxLength={120} /></label>
      <label className="block">Số điện thoại / Zalo<input className={o} type="tel" autoComplete="tel" value={sdt} onChange={e => setSdt(e.target.value)} required /></label>
      {canDatMatKhau && <label className="block">Đặt mật khẩu<input className={o} type="password" autoComplete="new-password" minLength={8} value={matKhau} onChange={e => setMatKhau(e.target.value)} required /></label>}
      <label className="flex gap-3"><input type="checkbox" checked={dongY} onChange={e => setDongY(e.target.checked)} />Tôi tự nguyện tham gia, đồng ý học và làm bài kiểm tra trước khi nhận link giới thiệu sản phẩm.</label>
      <button className={nut} disabled={dangGui || !dongY} onClick={dangKyHoc}>Đăng ký học miễn phí</button>
    </section> : <>
      <section className="space-y-3 rounded-xl border p-6"><h2 className="text-xl font-semibold">Tài khoản Affi của chị</h2>
        <p>{dk.ready ? `Đã đủ điều kiện chia sẻ: ${dk.products.map(p => p.code).join(", ")}.` : "Chưa có link Affi. Chị hoàn tất các bài học bắt buộc và bài kiểm tra sản phẩm từ 90% trước nhé."}</p>
        <button className={nut} disabled={!dk.ready || dangGui} onClick={moAffi}>Mở Affi và nhận link sản phẩm</button>
        <button className="ml-4 underline" onClick={() => tai().catch(e => setLoi(thongDiepLoi(e)))}>Cập nhật kết quả</button>
      </section>
      <section><h2 className="mb-4 text-xl font-semibold">Bài học của chị</h2>{!khoa.length && <p>LYNO đang chuẩn bị nội dung học. Chị chưa được cấp link khi chưa có bài kiểm tra hợp lệ.</p>}
        <div className="space-y-3">{khoa.map(k => <a key={k.id} href={`/hoc-vien/khoa-hoc/${k.id}`} className="block rounded-xl border p-5"><b>{k.code ? `${k.code} · ` : ""}{k.name}</b><p className="text-sm text-stone-600">Đã học {k.progress}% · {k.score === null ? "Chưa thi" : `Điểm cao nhất: ${k.score}%`} · {k.completed ? "Hoàn tất" : "Tiếp tục học"}</p></a>)}</div>
      </section>
    </>}
  </div>;
}
