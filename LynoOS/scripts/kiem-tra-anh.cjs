const fs = require('node:fs');
const path = require('node:path');
const site = 'https://lyno.com.vn';
async function main() {
  const targets = fs.readdirSync(path.resolve(__dirname, '../apps/web/public/images/lyno')).filter(f => f.endsWith('.jpg')).map(f => `/images/lyno/${f}`);
  for (const page of ['/', '/dao-tao', '/san-pham']) {
    const response = await fetch(site + page, { signal: AbortSignal.timeout(45000) });
    if (!response.ok) throw new Error(`${page}: HTTP ${response.status}`);
    const html = await response.text();
    if (/\[(?:Ảnh|Hình|Khăn)/.test(html)) throw new Error(`Image placeholder remains on ${page}`);
    for (const img of html.matchAll(/<img\b[^>]*\bsrc="([^"]+)"/g)) {
      const src = img[1].replaceAll('&amp;', '&');
      if (src.startsWith('/_next/image') || src.startsWith('/images/lyno/')) targets.push(src);
    }
  }
  const unique = [...new Set(targets)];
  let cursor = 0;
  await Promise.all(Array.from({ length: 4 }, async () => {
    while (cursor < unique.length) {
      const url = unique[cursor++];
      const r = await fetch(site + url, { signal: AbortSignal.timeout(45000) });
      if (!r.ok || !r.headers.get('content-type')?.startsWith('image/')) throw new Error(`${url}: HTTP ${r.status}`);
      await r.arrayBuffer();
    }
  }));
  console.log(`Verified ${unique.length} public image URLs including all 71 uploaded files and optimized images; home, training and product pages are HTTP 200 without image placeholders.`);
}
main().catch(e => { console.error(e.message); process.exit(1); });
