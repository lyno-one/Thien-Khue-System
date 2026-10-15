// Chay api (:3310) + web (:3300) mot lenh. Kiem cong trong truoc khi bat de khong dung tien trinh cu.
import { spawn } from "node:child_process";
import net from "node:net";

const DICH_VU = [
  { ten: "api", cong: 3310, lenh: "pnpm --filter api dev", mau: "\x1b[36m" },
  { ten: "web", cong: 3300, lenh: "pnpm --filter web dev", mau: "\x1b[35m" }
];

function congTrong(cong) {
  return new Promise(resolve => {
    const may = net.createServer();
    may.once("error", () => resolve(false));
    may.once("listening", () => may.close(() => resolve(true)));
    may.listen(cong, "0.0.0.0");
  });
}

const banDau = await Promise.all(DICH_VU.map(d => congTrong(d.cong)));
const dangBan = DICH_VU.filter((_, i) => !banDau[i]);
if (dangBan.length) {
  for (const d of dangBan) console.error(`Cổng ${d.cong} (${d.ten}) đang bị chiếm — tắt tiến trình cũ rồi chạy lại.`);
  process.exit(1);
}

const tienTrinh = DICH_VU.map(d => {
  const p = spawn(d.lenh, { shell: true, stdio: ["ignore", "pipe", "pipe"], env: process.env });
  const ghi = luong => chunk => {
    for (const dong of chunk.toString().split(/\r?\n/)) if (dong) luong.write(`${d.mau}[${d.ten}]\x1b[0m ${dong}\n`);
  };
  p.stdout.on("data", ghi(process.stdout));
  p.stderr.on("data", ghi(process.stderr));
  p.on("exit", code => {
    console.log(`[${d.ten}] dừng (mã ${code})`);
    dung();
  });
  return p;
});

let dangDung = false;
function dung() {
  if (dangDung) return;
  dangDung = true;
  for (const p of tienTrinh) {
    if (p.exitCode !== null) continue;
    // Windows: shell con khong nhan SIGINT — kill ca cay tien trinh
    if (process.platform === "win32") spawn("taskkill", ["/pid", String(p.pid), "/T", "/F"], { stdio: "ignore" });
    else p.kill("SIGINT");
  }
  setTimeout(() => process.exit(0), 500);
}
process.on("SIGINT", dung);
process.on("SIGTERM", dung);
