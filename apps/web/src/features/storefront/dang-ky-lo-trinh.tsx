"use client";

import Link from "next/link";
import { useState } from "react";
import type { LoTrinhDangKy } from "@thien-khue/contracts";
import { lopKicker, lopNutChinh, lopTab, lopThanhTab } from "@/components/ui";
import { LO_TRINH, THU_TU_LO_TRINH } from "./noi-dung";
import { KhoiVaForm } from "./trang-vai-tro";

/** Khu "Đăng ký" cuoi trang Dao tao (Main.dc.html #dang-ky-lo-trinh): chon lo trinh -> khoi noi dung + form */
export function DangKyLoTrinh({ loTrinhDau }: { loTrinhDau: LoTrinhDangKy }) {
  const [loTrinh, setLoTrinh] = useState<LoTrinhDangKy>(loTrinhDau);
  const t = LO_TRINH[loTrinh];

  function chon(k: LoTrinhDangKy) {
    setLoTrinh(k);
    // Giu link chia se duoc (khong tai lai trang)
    try {
      window.history.replaceState(null, "", `?lo-trinh=${k}#dang-ky-lo-trinh`);
    } catch {
      /* bo qua */
    }
  }

  return (
    <>
      <div id="dang-ky-lo-trinh" className="mx-auto flex max-w-tk scroll-mt-28 flex-col gap-6 px-4 pt-20 md:px-10 md:pt-24">
        <div className="flex flex-col gap-2">
          <span className={lopKicker}>Đăng ký</span>
          <h2 className="m-0 text-h1 text-chu">Trở thành một phần của đội ngũ</h2>
        </div>
        <div className="flex flex-col items-start justify-between gap-4 rounded-xl border border-chinh/20 bg-chinh-nhat p-5 md:flex-row md:items-center md:gap-6 md:px-6">
          <div className="flex flex-col gap-1">
            <span className="text-h3 text-chu">Học viện Thiên Khuê S</span>
            <span className="text-body text-chu-phu">Đã có tài khoản? Vào cổng học để tiếp tục bài học, làm bài kiểm tra và nhận chứng chỉ.</span>
          </div>
          <Link href="/hoc-vien" className={lopNutChinh}>
            Vào cổng học
          </Link>
        </div>
        <div className={`${lopThanhTab} self-start`} role="group" aria-label="Chọn lộ trình">
          {THU_TU_LO_TRINH.map(k => {
            const dangChon = k === loTrinh;
            return (
              <button key={k} type="button" onClick={() => chon(k)} aria-pressed={dangChon} className={`cursor-pointer border-0 ${lopTab(dangChon)}`}>
                {LO_TRINH[k].label}
              </button>
            );
          })}
        </div>
      </div>

      <KhoiVaForm
        khoaForm={loTrinh}
        block={t}
        trang="DAO_TAO"
        loTrinh={loTrinh}
        form={{ title: `Trở thành ${t.label}`, selectLabel: "Hình thức", options: t.options, noteLabel: "Kinh nghiệm hoặc kênh của bạn", cta: `Đăng ký ${t.label}` }}
      />
    </>
  );
}
