// Збирає assets/search-index.json — текст усіх документів з каталогу для пошуку на хабі —
// і повертає підключення плашки онбордингу (assets/doc.js) у документи, де його загубили.
// Запуск: node scripts/build-search-index.js   (без залежностей; у CI запускається сам після кожного пушу)
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'assets/catalog.js'), 'utf8'), sandbox);
const { DOCS, CATS } = sandbox.window.HUB;

const catOf = {};
for (const c of CATS) for (const g of c.groups) for (const p of g.items) if (!catOf[p]) catOf[p] = c.title;

const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', mdash: '—', ndash: '–', laquo: '«', raquo: '»', hellip: '…', rarr: '→', larr: '←', times: '×' };
function toText(html) {
  return html
    .replace(/<(script|style|svg|nav|footer|noscript)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<\/(p|div|li|h[1-6]|tr|td|th|section)>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/&([a-z]+);/gi, (m, n) => ENT[n.toLowerCase()] ?? ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const out = [];
for (const [p, d] of Object.entries(DOCS)) {
  if (d.href || p.includes('#')) continue;
  const file = path.join(ROOT, p.endsWith('/') ? p + 'index.html' : p);
  if (!fs.existsSync(file)) { console.warn('немає файлу:', p); continue; }
  let html = fs.readFileSync(file, 'utf8');
  if (!html.includes('assets/doc.js')) {
    const tag = '<script src="../assets/doc.js" defer></script>\n';
    const i = html.lastIndexOf('</body>');
    html = i < 0 ? html + '\n' + tag : html.slice(0, i) + tag + html.slice(i);
    fs.writeFileSync(file, html);
    console.log('повернуто doc.js:', p);
  }
  const text = toText(html);
  out.push({ p, t: d.t, c: catOf[p] || '', x: text.slice(0, 40000) });
}
fs.writeFileSync(path.join(ROOT, 'assets/search-index.json'), JSON.stringify(out));
const kb = Math.round(fs.statSync(path.join(ROOT, 'assets/search-index.json')).size / 1024);
console.log(`індекс: ${out.length} документів, ${kb} КБ`);
