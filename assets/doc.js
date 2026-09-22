/* Magic Hub — плашка онбордингу всередині документа: «Позначити пройденим» і «Далі».
   Підключається одним рядком перед </body>: <script src="../assets/doc.js" defer></script>
   Нічого не знає про верстку сторінки: усі стилі з префіксом mhd-, усе в одному контейнері. */
(function () {
  var base = (document.currentScript && document.currentScript.src || '').replace(/assets\/doc\.js.*$/, '');
  if (!base) return;
  var s = document.createElement('script');
  s.src = base + 'assets/catalog.js';
  s.onload = init;
  document.head.appendChild(s);

  function myKey() {
    var parts = location.pathname.split('/').filter(Boolean);
    var last = parts[parts.length - 1] || '';
    if (/\.html$/.test(last) && last !== 'index.html') return decodeURIComponent(parts.slice(-2).join('/'));
    var dir = last === 'index.html' ? parts[parts.length - 2] : last;
    return decodeURIComponent(dir) + '/';
  }

  function init() {
    var H = window.HUB; if (!H) return;
    var key = myKey();
    if (!H.DOCS[key]) return;
    var KEY = 'magichub:done', done;
    try { done = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { done = {}; }
    var flat = [];
    H.COURSE.forEach(function (m) { m.items.forEach(function (p) { if (flat.indexOf(p) < 0) flat.push(p); }); });
    var pos = flat.indexOf(key), next = pos >= 0 ? flat[pos + 1] : null;

    var css = '' +
      '.mhd{position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:9999;display:flex;gap:6px;align-items:center;' +
      'background:rgba(12,14,20,.92);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);padding:6px;border-radius:999px;' +
      'box-shadow:0 12px 32px rgba(12,14,20,.28);font:500 14px/1 Onest,system-ui,sans-serif;max-width:calc(100vw - 24px)}' +
      '.mhd a,.mhd button{all:unset;cursor:pointer;display:inline-flex;align-items:center;gap:7px;padding:10px 15px;border-radius:999px;color:#fff;white-space:nowrap;font:inherit}' +
      '.mhd .mhd-home{color:rgba(255,255,255,.72)} .mhd .mhd-home:hover{color:#fff;background:rgba(255,255,255,.1)}' +
      '.mhd .mhd-mark{background:linear-gradient(135deg,#38A0FF,#AA7AFF);font-weight:700}' +
      '.mhd .mhd-mark.on{background:#2EC28A}' +
      '.mhd .mhd-next{background:rgba(255,255,255,.12);overflow:hidden;text-overflow:ellipsis;max-width:260px}' +
      '.mhd .mhd-next:hover{background:rgba(255,255,255,.2)}' +
      '.mhd svg{width:16px;height:16px;flex:none}' +
      '@media(max-width:560px){.mhd .mhd-next span{display:none}.mhd .mhd-home span{display:none}}' +
      '@media print{.mhd{display:none}}';
    var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

    var svg = function (d) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">' + d + '</svg>'; };
    var I_HOME = svg('<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>');
    var I_CHECK = svg('<polyline points="20 6 9 17 4 12"/>');
    var I_ARROW = svg('<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>');

    var bar = document.createElement('div'); bar.className = 'mhd';
    var home = '<a class="mhd-home" href="' + base + (pos >= 0 ? 'onboarding/' : '') + '" title="' + (pos >= 0 ? 'Онбординг' : 'Magic Hub') + '">' + I_HOME + '<span>' + (pos >= 0 ? 'Онбординг' : 'Hub') + '</span></a>';
    bar.innerHTML = home + '<button class="mhd-mark"></button>' +
      (next ? '<a class="mhd-next" href="' + base + next + '" title="Далі: ' + H.DOCS[next].t.replace(/"/g, '&quot;') + '"><span>Далі: ' + H.DOCS[next].t + '</span>' + I_ARROW + '</a>' : '');
    var btn = bar.querySelector('.mhd-mark');
    function paint() {
      var on = !!done[key];
      btn.classList.toggle('on', on);
      btn.innerHTML = I_CHECK + (on ? 'Пройдено' : 'Позначити пройденим');
    }
    btn.addEventListener('click', function () {
      try { done = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { done = {}; }
      if (done[key]) delete done[key]; else done[key] = Date.now();
      try { localStorage.setItem(KEY, JSON.stringify(done)); } catch (e) {}
      paint();
    });
    paint();
    document.body.appendChild(bar);
    document.body.style.paddingBottom = Math.max(parseInt(getComputedStyle(document.body).paddingBottom) || 0, 76) + 'px';
  }
})();
