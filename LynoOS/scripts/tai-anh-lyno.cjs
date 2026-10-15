const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'lyno-source.html'), 'utf8');
const tags = html.match(/<img\b[^>]*>/g) || [];
const records = tags.map(tag => {
  const attr = name => tag.match(new RegExp(`(?:^|\\s)${name}="([^"]+)"`))?.[1];
  const set = attr('srcset') || attr('data-srcset') || attr('data-splide-lazy-srcset');
  return { alt: attr('alt') || '', url: set ? set.split(',').at(-1).trim().split(/\s+/)[0] : attr('data-src') || attr('src') };
}).filter(r => r.url?.startsWith('https://img1.lyno.vn/'));
const categories = ['SƠ MI CÔNG SỞ', 'SƠ MI HỌA TIẾT', 'ÁO KIỂU', 'ÁO LỤA CAO CẤP', 'ÁO THUN/ÁO LEN', 'CHÂN VÁY', 'QUẦN', 'ĐẦM/SET', 'BLAZER', 'KHĂN THIÊN KHUÊ'];
const names = ['so-mi', 'hoa-tiet', 'ao-kieu', 'ao-lua', 'ao-thun', 'chan-vay', 'quan', 'dam', 'blazer', 'khan-lua'];
const jobs = [];
for (let i = 0; i < categories.length; i++) {
  const r = records.find(r => r.alt === categories[i]);
  if (!r) throw new Error(`Missing category ${categories[i]}`);
  jobs.push({ ...r, file: names[i] + '.jpg' });
}
for (const [alt, file] of [['Homepage slide', 'bo-suu-tap.jpg'], ['CỬA HÀNG', 'cua-hang.jpg']]) {
  const r = records.find(r => r.alt === alt);
  if (r) jobs.push({ ...r, file });
}
const scarves = records.filter(r => /^KHĂN LỤA/.test(r.alt));
scarves.slice(0, 3).forEach((r, i) => jobs.push({ ...r, file: `khan-${i + 1}.jpg` }));
const products = {};
for (const r of records) {
  const ma = r.alt.match(/\b(?:AB|AL|HI|TK|K)\d{4,6}\b/i)?.[0]?.toUpperCase();
  if (!ma || products[ma]) continue;
  products[ma] = `/images/lyno/${ma}.jpg`;
  jobs.push({ ...r, file: `${ma}.jpg` });
}
async function run() {
  const dir = path.join(root, 'apps/web/public/images/lyno');
  fs.mkdirSync(dir, { recursive: true });
  let cursor = 0;
  await Promise.all(Array.from({ length: 5 }, async () => {
    while (cursor < jobs.length) {
      const job = jobs[cursor++];
      const response = await fetch(job.url, { signal: AbortSignal.timeout(45000) });
      if (!response.ok || !response.headers.get('content-type')?.startsWith('image/')) throw new Error(`Bad image: ${job.alt} ${response.status}`);
      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.length < 1000) throw new Error(`Empty image ${job.file}`);
      fs.writeFileSync(path.join(dir, job.file), buffer);
    }
  }));
  fs.writeFileSync(path.join(dir, 'sources.json'), JSON.stringify({ source: 'https://lyno.vn/', images: jobs }, null, 2));
  fs.writeFileSync(path.join(root, 'apps/web/src/lib/anh-san-pham-lyno.json'), JSON.stringify(products, null, 2));
  console.log(`Downloaded ${jobs.length} official LYNO images; matched ${Object.keys(products).length} product codes.`);
}
run().catch(e => { console.error(e.message); process.exit(1); });
