/* Magic Hub — головна, категорії, онбординг і пошук.
   Прогрес живе в localStorage цього браузера: жодного сервера, жодного логіну. */
(function () {
  var H = window.HUB, body = document.body;
  var ROOT = body.getAttribute('data-root') || '';
  var PAGE = body.getAttribute('data-page');
  var KEY = 'magichub:done';

  /* ── прогрес ─────────────────────────────────────────── */
  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  function save(d) { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {} }
  var done = load();
  function isDone(p) { return !!done[p.split('#')[0]]; }
  function toggle(p) { var k = p.split('#')[0]; if (done[k]) delete done[k]; else done[k] = Date.now(); save(done); }
  var courseItems = [];
  H.COURSE.forEach(function (m) { m.items.forEach(function (p) { if (courseItems.indexOf(p) < 0) courseItems.push(p); }); });
  function courseDone() { return courseItems.filter(isDone).length; }
  function nextInCourse() { for (var i = 0; i < courseItems.length; i++) if (!isDone(courseItems[i])) return courseItems[i]; return null; }
  function moduleOf(p) { for (var i = 0; i < H.COURSE.length; i++) if (H.COURSE[i].items.indexOf(p) >= 0) return i; return -1; }

  /* ── утиліти ─────────────────────────────────────────── */
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function href(p) { var d = H.DOCS[p]; return d && d.href ? d.href : ROOT + p; }
  function ext(p) { var d = H.DOCS[p]; return d && d.href ? ' target="_blank" rel="noopener"' : ''; }
  function catOf(p) { for (var i = 0; i < H.CATS.length; i++) { var c = H.CATS[i]; for (var j = 0; j < c.groups.length; j++) if (c.groups[j].items.indexOf(p) >= 0) return c; } return null; }
  function catItems(c) { var a = []; c.groups.forEach(function (g) { a = a.concat(g.items); }); return a; }
  function toast(t) { var el = document.querySelector('.toast'); if (!el) { el = document.createElement('div'); el.className = 'toast'; body.appendChild(el); } el.textContent = t; el.classList.add('show'); clearTimeout(el._t); el._t = setTimeout(function () { el.classList.remove('show'); }, 2200); }

  var ICONS = {
    building: '<path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/>',
    compass: '<circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>',
    layers: '<path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    folder: '<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>',
    doc: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>',
    link: '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
    check: '<polyline points="20 6 9 17 4 12"/>',
    arrow: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
    chev: '<path d="m6 9 6 6 6-6"/>',
    grad: '<path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>'
  };
  function ico(n, s) { s = s || 20; return '<svg class="i" width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + ICONS[n] + '</svg>'; }

  function card(p) {
    var d = H.DOCS[p]; if (!d) return '';
    var dn = !d.href && isDone(p);
    return '<a class="card' + (dn ? ' is-done' : '') + '" href="' + esc(href(p)) + '"' + ext(p) + '>' +
      '<div class="tile">' + ico(d.href ? 'link' : 'doc') + '</div>' +
      '<div><h3>' + esc(d.t) + '</h3><p>' + esc(d.d) + '</p></div>' +
      '<span class="done">' + ico('check', 14) + '</span></a>';
  }

  /* ── головна ─────────────────────────────────────────── */
  function renderHome() {
    var total = courseItems.length, n = courseDone(), pct = Math.round(n / total * 100);
    var nx = nextInCourse(), m = nx ? moduleOf(nx) : -1;
    var el = document.getElementById('start');
    el.innerHTML =
      '<div class="start-card">' +
        '<div class="kicker">Почни тут · онбординг</div>' +
        '<h2>' + (n === 0 ? 'Пройди базу знань за 4 тижні' : n === total ? 'Онбординг пройдено' : 'Продовжуй онбординг') + '</h2>' +
        '<p>' + H.COURSE.length + ' модулів у тому порядку, в якому їх варто читати. Відмічай пройдене — прогрес збережеться в цьому браузері.</p>' +
        '<div class="bar"><i style="width:' + pct + '%"></i></div>' +
        '<div class="bar-l"><span><b>' + n + '</b> з ' + total + ' документів</span><span>' + pct + '%</span></div>' +
        (nx ? '<a class="next-doc" href="' + esc(href(nx)) + '"><div class="tile" style="width:40px;height:40px;border-radius:12px;background:var(--grad);color:#fff;display:grid;place-items:center">' + ico('arrow') + '</div><div><div class="nd-m">Наступне · модуль ' + (m + 1) + ' «' + esc(H.COURSE[m].title) + '»</div><div class="nd-t">' + esc(H.DOCS[nx].t) + '</div></div></a>' : '') +
        '<a class="btn" href="' + ROOT + 'onboarding/">' + ico('grad', 18) + (n === 0 ? 'Почати онбординг' : 'Усі модулі') + '</a>' +
      '</div>' +
      '<div class="start-card">' +
        '<div class="kicker">Як користуватись базою</div>' +
        '<ul class="rules">' +
          '<li><span class="n">1</span><span><b>Шукай тут, а не в чаті.</b> Пошук іде по тексту всіх документів.</span></li>' +
          '<li><span class="n">2</span><span><b>Один документ — одне джерело правди.</b> Якщо в чаті інакше, правильно тут.</span></li>' +
          '<li><span class="n">3</span><span><b>Бачиш застаріле — скажи власнику.</b> Власник і дата оновлення є в шапці кожного документа.</span></li>' +
          '<li><span class="n">4</span><span><b>Не знайшов відповіді — напиши CEO.</b> Значить, документа бракує, і його треба додати.</span></li>' +
        '</ul>' +
      '</div>';

    document.getElementById('cats').innerHTML = H.CATS.map(function (c) {
      var items = catItems(c).filter(function (p) { return !H.DOCS[p].href; });
      var dn = items.filter(isDone).length;
      return '<a class="cat" href="' + ROOT + c.id + '/">' +
        '<div class="tile">' + ico(c.icon, 24) + '</div>' +
        '<h3>' + esc(c.title) + '</h3><p>' + esc(c.desc) + '</p>' +
        '<div class="meta"><span>' + (items.length ? '<b>' + items.length + '</b> документів' : 'Наповнюється') + '</span>' +
        (items.length ? '<span>пройдено ' + dn + '</span>' : '') + '</div>' +
        (items.length ? '<div class="minibar"><i style="width:' + Math.round(dn / items.length * 100) + '%"></i></div>' : '') +
        '</a>';
    }).join('');
    var cnt = document.getElementById('docCount');
    if (cnt) cnt.textContent = Object.keys(H.DOCS).filter(function (p) { return !H.DOCS[p].href && p.indexOf('#') < 0; }).length;
  }

  /* ── категорія ───────────────────────────────────────── */
  function renderCat() {
    var id = body.getAttribute('data-cat'), c = H.CATS.filter(function (x) { return x.id === id; })[0];
    if (!c) return;
    document.title = c.title + ' · Magic Hub';
    document.getElementById('catTitle').textContent = c.title;
    document.getElementById('catDesc').textContent = c.desc;
    document.getElementById('catIcon').innerHTML = ico(c.icon, 16);
    var el = document.getElementById('groups');
    if (!c.groups.length) {
      el.innerHTML = '<div class="empty"><h3>Розділ наповнюється</h3><p>Документи цієї категорії ще готуються. Питання з цієї теми — до CEO.</p></div>';
      return;
    }
    el.innerHTML = c.groups.map(function (g) {
      return '<div class="group"><div class="group-h">' + esc(g.title) + ' <span>' + g.items.length + '</span></div>' +
        '<div class="grid">' + g.items.map(card).join('') + '</div></div>';
    }).join('');
    document.querySelectorAll('.nav-links a[data-cat="' + id + '"]').forEach(function (a) { a.classList.add('on'); });
  }

  /* ── онбординг ───────────────────────────────────────── */
  function renderCourse() {
    var el = document.getElementById('course');
    var firstOpen = -1;
    el.innerHTML = H.COURSE.map(function (m, i) {
      var dn = m.items.filter(isDone).length, all = dn === m.items.length;
      if (!all && firstOpen < 0) firstOpen = i;
      return '<div class="module' + (all ? ' complete' : '') + '" id="m' + (i + 1) + '">' +
        '<div class="mod-h" data-i="' + i + '">' +
          '<div class="mod-n">' + (all ? ico('check', 22) : i + 1) + '</div>' +
          '<div class="mod-t"><h3>' + esc(m.title) + '</h3><p>' + esc(m.goal) + '</p></div>' +
          '<span class="mod-when">' + esc(m.when) + '</span>' +
          '<span class="mod-p"><b>' + dn + '</b>/' + m.items.length + '</span>' +
          '<span class="chev">' + ico('chev') + '</span>' +
        '</div>' +
        '<div class="mod-b">' + m.items.map(function (p) {
          var d = H.DOCS[p];
          return '<div class="step' + (isDone(p) ? ' is-done' : '') + '">' +
            '<button class="chk" data-p="' + esc(p) + '" aria-label="Позначити пройденим">' + ico('check', 15) + '</button>' +
            '<a href="' + esc(href(p)) + '"><div class="st">' + esc(d.t) + '</div><div class="sd">' + esc(d.d) + '</div></a>' +
            '<span class="go">' + ico('arrow', 18) + '</span></div>';
        }).join('') + '</div></div>';
    }).join('');
    if (firstOpen >= 0) document.getElementById('m' + (firstOpen + 1)).classList.add('open');
    var total = courseItems.length, n = courseDone(), pct = Math.round(n / total * 100);
    document.getElementById('cBar').style.width = pct + '%';
    document.getElementById('cNum').textContent = n;
    document.getElementById('cTot').textContent = total;
    document.getElementById('cPct').textContent = pct + '%';
  }
  function courseEvents() {
    document.getElementById('course').addEventListener('click', function (e) {
      var chk = e.target.closest('.chk');
      if (chk) { toggle(chk.getAttribute('data-p')); var open = [].map.call(document.querySelectorAll('.module.open'), function (x) { return x.id; }); renderCourse(); document.querySelectorAll('.module').forEach(function (x) { x.classList.toggle('open', open.indexOf(x.id) >= 0); }); return; }
      var h = e.target.closest('.mod-h');
      if (h) h.parentNode.classList.toggle('open');
    });
    var name = document.getElementById('who');
    try { name.value = localStorage.getItem('magichub:name') || ''; } catch (e) {}
    name.addEventListener('input', function () { try { localStorage.setItem('magichub:name', name.value); } catch (e) {} });
    document.getElementById('report').addEventListener('click', function () {
      var who = name.value.trim() || 'Без імені', n = courseDone(), total = courseItems.length;
      var lines = ['Онбординг Magic Hub — ' + who, 'Пройдено: ' + n + ' з ' + total + ' (' + Math.round(n / total * 100) + '%)', ''];
      H.COURSE.forEach(function (m, i) {
        var dn = m.items.filter(isDone).length;
        lines.push((dn === m.items.length ? '✓ ' : '○ ') + (i + 1) + '. ' + m.title + ' — ' + dn + '/' + m.items.length);
        m.items.forEach(function (p) { if (!isDone(p)) lines.push('     не пройдено: ' + H.DOCS[p].t); });
      });
      var txt = lines.join('\n');
      (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(function () { toast('Звіт скопійовано — надішли його CEO'); }, function () { window.prompt('Скопіюй звіт і надішли CEO:', txt); });
    });
    document.getElementById('reset').addEventListener('click', function () {
      if (!confirm('Скинути весь прогрес онбордингу в цьому браузері?')) return;
      done = {}; save(done); renderCourse(); toast('Прогрес скинуто');
    });
  }

  /* ── пошук ───────────────────────────────────────────── */
  var index = null, loading = false, waiting = [];
  function fallbackIndex() {
    return Object.keys(H.DOCS).filter(function (p) { return p.indexOf('#') < 0; }).map(function (p) {
      var c = catOf(p); return { p: p, t: H.DOCS[p].t, c: c ? c.title : '', x: H.DOCS[p].d };
    });
  }
  function ensureIndex(cb) {
    if (index) return cb();
    waiting.push(cb);
    if (loading) return;
    loading = true;
    fetch(ROOT + 'assets/search-index.json').then(function (r) { if (!r.ok) throw 0; return r.json(); })
      .then(function (j) { index = j; }, function () { index = fallbackIndex(); })
      .then(function () { loading = false; var w = waiting; waiting = []; w.forEach(function (f) { f(); }); });
  }
  function norm(s) { return s.toLowerCase().replace(/ё/g, 'е').replace(/[’']/g, "'"); }
  function search(q) {
    var terms = norm(q).split(/\s+/).filter(function (t) { return t.length > 1; });
    if (!terms.length) return [];
    return index.map(function (e) {
      var T = norm(e.t), X = norm(e.x || ''), score = 0;
      for (var i = 0; i < terms.length; i++) {
        var t = terms[i], inT = T.indexOf(t) >= 0, inX = X.indexOf(t) >= 0;
        if (!inT && !inX) return null;
        score += (inT ? 20 : 0) + (inX ? Math.min(10, X.split(t).length - 1) : 0);
      }
      return { e: e, s: score };
    }).filter(Boolean).sort(function (a, b) { return b.s - a.s; }).slice(0, 12);
  }
  function snippet(text, terms) {
    var X = norm(text), pos = -1;
    for (var i = 0; i < terms.length && pos < 0; i++) pos = X.indexOf(terms[i]);
    if (pos < 0) return esc(text.slice(0, 150));
    var a = Math.max(0, pos - 60), s = (a ? '…' : '') + text.slice(a, pos + 110) + '…';
    s = esc(s);
    terms.forEach(function (t) { s = s.replace(new RegExp('(' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi'), '<mark>$1</mark>'); });
    return s;
  }
  function searchUI() {
    var input = document.getElementById('q'), box = document.getElementById('results');
    if (!input) return;
    var sel = -1;
    function draw() {
      var q = input.value.trim();
      if (q.length < 2) { box.classList.remove('open'); return; }
      ensureIndex(function () {
        var terms = norm(q).split(/\s+/).filter(function (t) { return t.length > 1; });
        var r = search(q); sel = -1;
        box.innerHTML = r.length ? r.map(function (x) {
          return '<a class="res" href="' + esc(href(x.e.p)) + '"' + ext(x.e.p) + '><span class="rt">' + esc(x.e.t) + '</span><span class="rc">' + esc(x.e.c || '') + '</span><div class="rs">' + snippet(x.e.x || '', terms) + '</div></a>';
        }).join('') : '<div class="res-empty">Нічого не знайшли за «' + esc(q) + '». Спробуй інше слово — або напиши CEO: значить, цього документа бракує.</div>';
        box.classList.add('open');
      });
    }
    input.addEventListener('input', draw);
    input.addEventListener('focus', function () { ensureIndex(function () {}); if (input.value.trim().length > 1) draw(); });
    input.addEventListener('keydown', function (e) {
      var items = box.querySelectorAll('.res');
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault(); if (!items.length) return;
        sel = (sel + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
        items.forEach(function (x, i) { x.classList.toggle('sel', i === sel); });
        items[sel].scrollIntoView({ block: 'nearest' });
      } else if (e.key === 'Enter') { var t = items[sel >= 0 ? sel : 0]; if (t) location.href = t.href; }
      else if (e.key === 'Escape') { box.classList.remove('open'); input.blur(); }
    });
    document.addEventListener('click', function (e) { if (!e.target.closest('.search')) box.classList.remove('open'); });
    document.addEventListener('keydown', function (e) { if (e.key === '/' && document.activeElement !== input && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) { e.preventDefault(); input.focus(); } });
  }

  if (PAGE === 'home') renderHome();
  if (PAGE === 'cat') renderCat();
  if (PAGE === 'course') { renderCourse(); courseEvents(); }
  searchUI();
  window.addEventListener('pageshow', function (e) { if (e.persisted) { done = load(); if (PAGE === 'home') renderHome(); if (PAGE === 'cat') renderCat(); if (PAGE === 'course') renderCourse(); } });
})();
