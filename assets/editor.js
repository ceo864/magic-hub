/* Magic Hub — редагування документа прямо на сторінці зі збереженням у GitHub.
   Вантажиться тільки коли редактор натиснув «Редагувати» (див. doc.js).

   Як це безпечно для верстки: правимо не живу сторінку, а її вихідний HTML з GitHub.
   Редагованим стає лише той текстовий блок, чий вміст у живій сторінці збігається з вихідним
   байт-у-байт — тобто його не змінили скрипти (квізи, калькулятори, іконки). Зберігаємо
   тільки змінені блоки назад у вихідний HTML, решта файлу лишається як була. */
(function () {
  var REPO = 'ceo864/magic-hub', BRANCH = 'main', TK = 'magichub:gh';
  var SEL = 'h1,h2,h3,h4,h5,h6,p,li,td,th,dt,dd,blockquote,figcaption,.chip';
  var BLOCKERS = 'input,select,textarea,button,canvas,iframe,video,script';

  function norm(s) { return s.replace(/\s+/g, ' ').trim(); }
  function b64dec(s) {
    var bin = atob(s.replace(/\s/g, '')), u = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(u);
  }
  function b64enc(str) {
    var u = new TextEncoder().encode(str), bin = '';
    for (var i = 0; i < u.length; i += 0x8000) bin += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
    return btoa(bin);
  }
  function pathOf(el, root) {
    var p = [];
    while (el && el !== root) { p.unshift([].indexOf.call(el.parentNode.children, el)); el = el.parentNode; }
    return p;
  }
  function at(root, p) { var el = root; for (var i = 0; i < p.length && el; i++) el = el.children[p[i]]; return el; }
  function today() { var d = new Date(); return ('0' + d.getDate()).slice(-2) + '.' + ('0' + (d.getMonth() + 1)).slice(-2) + '.' + d.getFullYear(); }
  function getToken() { try { return localStorage.getItem(TK); } catch (e) { return null; } }
  function setToken(t) { try { t ? localStorage.setItem(TK, t) : localStorage.removeItem(TK); } catch (e) {} }

  /* ── стилі ─────────────────────────────────────────── */
  var css = '' +
    '.mh-ed{outline:1.5px dashed rgba(56,160,255,.45);outline-offset:3px;border-radius:4px;cursor:text;transition:outline-color .15s}' +
    '.mh-ed:hover{outline-color:#38A0FF}.mh-ed:focus{outline:2px solid #AA7AFF;background:rgba(170,122,255,.06)}' +
    '.mh-ed.mh-ch{outline-color:#2EC28A;background:rgba(46,194,138,.07)}' +
    '.mh-top{position:fixed;left:0;right:0;top:0;z-index:10001;background:#0C0E14;color:#fff;font:500 14px/1.3 Onest,system-ui,sans-serif;' +
      'display:flex;align-items:center;gap:12px;padding:10px 16px;box-shadow:0 6px 24px rgba(0,0,0,.25);flex-wrap:wrap}' +
    '.mh-top .mh-t{flex:1;min-width:220px;color:rgba(255,255,255,.8)} .mh-top b{color:#fff}' +
    '.mh-top .mh-n{background:rgba(255,255,255,.12);padding:6px 11px;border-radius:999px;font-weight:700}' +
    '.mh-b{all:unset;cursor:pointer;padding:9px 16px;border-radius:999px;font-weight:700;white-space:nowrap}' +
    '.mh-b.mh-save{background:linear-gradient(135deg,#38A0FF,#AA7AFF)} .mh-b.mh-save[disabled]{opacity:.4;cursor:default}' +
    '.mh-b.mh-cancel{background:rgba(255,255,255,.12)} .mh-b.mh-out{color:rgba(255,255,255,.6);font-weight:500}' +
    'body.mh-editing{padding-top:58px !important}' +
    '.mh-modal{position:fixed;inset:0;z-index:10002;background:rgba(12,14,20,.55);display:grid;place-items:center;padding:16px;font:400 15px/1.55 Onest,system-ui,sans-serif}' +
    '.mh-card{background:#fff;color:#0C0E14;border-radius:24px;max-width:520px;width:100%;padding:28px;box-shadow:0 24px 60px rgba(0,0,0,.3)}' +
    '.mh-card h3{font-weight:800;font-size:21px;margin:0 0 8px} .mh-card ol{margin:10px 0 14px 20px;color:#4B5160;font-size:14px}' +
    '.mh-card li{margin-bottom:5px} .mh-card a{color:#5E30C4;font-weight:700} .mh-card code{background:#EEF1F6;padding:1px 6px;border-radius:6px;font-size:13px}' +
    '.mh-card input{width:100%;box-sizing:border-box;height:46px;border:1.5px solid #DDE2EB;border-radius:12px;padding:0 14px;font:inherit;font-size:14px;outline:none}' +
    '.mh-card input:focus{border-color:#AA7AFF} .mh-row{display:flex;gap:10px;margin-top:16px;justify-content:flex-end}' +
    '.mh-card .mh-b{color:#0C0E14;background:#EEF1F6} .mh-card .mh-b.mh-save{color:#fff;background:linear-gradient(135deg,#38A0FF,#AA7AFF)}' +
    '.mh-err{color:#C0323B;font-size:13.5px;margin-top:8px;min-height:1em} .mh-note{font-size:12.5px;color:#6E7687;margin-top:10px}' +
    '.mh-toast{position:fixed;left:50%;bottom:84px;transform:translateX(-50%);z-index:10003;background:#0C0E14;color:#fff;padding:12px 20px;border-radius:999px;font:500 14px Onest,system-ui,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.25);max-width:calc(100vw - 32px);text-align:center}' +
    '@media print{.mh-top,.mh-toast{display:none}}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  function toast(t, ms) {
    var el = document.createElement('div'); el.className = 'mh-toast'; el.textContent = t;
    document.body.appendChild(el); setTimeout(function () { el.remove(); }, ms || 3500);
  }

  /* ── ключ доступу ─────────────────────────────────────── */
  function askToken(api, done) {
    var m = document.createElement('div'); m.className = 'mh-modal';
    m.innerHTML = '<div class="mh-card"><h3>Доступ редактора</h3>' +
      '<p style="margin:0;color:#4B5160;font-size:14px">Один раз на цей браузер. Правки зберігаються у GitHub від вашого імені.</p><ol>' +
      '<li>Відкрийте <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">новий токен у GitHub</a>.</li>' +
      '<li>Назва — <code>Magic Hub</code>, термін — на ваш вибір.</li>' +
      '<li>Repository access → <b>Only select repositories</b> → <code>magic-hub</code>.</li>' +
      '<li>Permissions → Repository → <b>Contents: Read and write</b>. Більше нічого не вмикайте.</li>' +
      '<li>Generate token → скопіюйте і вставте сюди.</li></ol>' +
      '<input type="password" placeholder="github_pat_…" autocomplete="off">' +
      '<div class="mh-err"></div>' +
      '<div class="mh-note">Токен зберігається лише в цьому браузері і дає доступ тільки до репозиторію бази знань.</div>' +
      '<div class="mh-row"><button class="mh-b mh-x">Скасувати</button><button class="mh-b mh-save">Підключити</button></div></div>';
    document.body.appendChild(m);
    var inp = m.querySelector('input'), err = m.querySelector('.mh-err');
    inp.focus();
    m.querySelector('.mh-x').onclick = function () { m.remove(); };
    function go() {
      var t = inp.value.trim(); if (!t) return;
      err.textContent = 'Перевіряю…';
      fetch(api + '?ref=' + BRANCH, { headers: { Authorization: 'Bearer ' + t, Accept: 'application/vnd.github+json' }, cache: 'no-store' })
        .then(function (r) {
          if (r.status === 401) throw 'Токен не приймається. Перевірте, що скопіювали його повністю.';
          if (r.status === 404) throw 'Токен не бачить репозиторій magic-hub. Перевірте крок 3.';
          if (!r.ok) throw 'GitHub відповів помилкою ' + r.status + '.';
          setToken(t); m.remove(); done(t);
        }).catch(function (e) { err.textContent = typeof e === 'string' ? e : 'Немає зв\'язку з GitHub.'; });
    }
    m.querySelector('.mh-save').onclick = go;
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') go(); });
  }

  /* ── основне ─────────────────────────────────────────── */
  function start(opt) {
    if (document.body.classList.contains('mh-editing')) return;
    var file = opt.key.slice(-1) === '/' ? opt.key + 'index.html' : opt.key;
    var api = 'https://api.github.com/repos/' + REPO + '/contents/' + file.split('/').map(encodeURIComponent).join('/');
    var token = getToken();
    if (!token) return askToken(api, function () { start(opt); });

    var H = { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json' };
    toast('Відкриваю документ для редагування…', 1500);
    fetch(api + '?ref=' + BRANCH, { headers: H, cache: 'no-store' }).then(function (r) {
      if (r.status === 401) { setToken(null); throw 'Токен більше не діє — підключіть новий.'; }
      if (!r.ok) throw 'Не вдалося завантажити документ з GitHub (' + r.status + ').';
      return r.json();
    }).then(function (j) {
      var src = b64dec(j.content), sha = j.sha;
      var pdoc = new DOMParser().parseFromString(src, 'text/html');
      var items = [];
      [].forEach.call(document.body.querySelectorAll(SEL), function (el) {
        if (el.closest('.mhd,.mh-top,.mh-modal,[data-mh-skip]')) return;
        if (el.querySelector(SEL) || el.querySelector(BLOCKERS)) return;
        if (!norm(el.textContent)) return;
        var pel = at(pdoc.body, pathOf(el, document.body));
        if (!pel || pel.tagName !== el.tagName || norm(pel.innerHTML) !== norm(el.innerHTML)) return;
        items.push({ el: el, pel: pel, orig: el.innerHTML, hadStyle: /style=/.test(pel.innerHTML) });
      });
      if (!items.length) throw 'На цій сторінці немає тексту, який можна безпечно правити тут.';
      enter(items, pdoc, sha, api, H, opt);
    }).catch(function (e) { toast(typeof e === 'string' ? e : 'Немає зв\'язку з GitHub.', 5000); });
  }

  function enter(items, pdoc, sha, api, H, opt) {
    document.body.classList.add('mh-editing');
    var bar = document.createElement('div'); bar.className = 'mh-top';
    bar.innerHTML = '<span class="mh-t"><b>Режим редагування.</b> Клацніть на текст у рамці й правте. Shift+Enter — новий рядок, Cmd/Ctrl+B — жирний.</span>' +
      '<span class="mh-n">0 змін</span><button class="mh-b mh-save" disabled>Зберегти</button>' +
      '<button class="mh-b mh-cancel">Скасувати</button><button class="mh-b mh-out" title="Забути токен у цьому браузері">Вийти</button>';
    document.body.appendChild(bar);
    var nEl = bar.querySelector('.mh-n'), save = bar.querySelector('.mh-save');

    function changed() { return items.filter(function (i) { return i.el.innerHTML !== i.orig; }); }
    function refresh() {
      var n = changed().length;
      nEl.textContent = n + (n === 1 ? ' зміна' : n > 1 && n < 5 ? ' зміни' : ' змін');
      save.disabled = !n;
      items.forEach(function (i) { i.el.classList.toggle('mh-ch', i.el.innerHTML !== i.orig); });
    }
    items.forEach(function (i) {
      i.el.setAttribute('contenteditable', 'true'); i.el.classList.add('mh-ed');
      i.el.addEventListener('input', refresh);
      i.el.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); i.el.blur(); } });
      i.el.addEventListener('paste', function (e) {
        e.preventDefault();
        var t = (e.clipboardData || window.clipboardData).getData('text/plain');
        document.execCommand('insertText', false, t);
      });
    });
    function blockLinks(e) { if (e.target.closest('a') && !e.target.closest('.mh-top,.mh-modal,.mhd')) e.preventDefault(); }
    document.addEventListener('click', blockLinks, true);
    function leaveGuard(e) { if (changed().length) { e.preventDefault(); e.returnValue = ''; } }
    window.addEventListener('beforeunload', leaveGuard);

    bar.querySelector('.mh-cancel').onclick = function () {
      if (changed().length && !confirm('Скасувати всі незбережені правки?')) return;
      window.removeEventListener('beforeunload', leaveGuard); location.reload();
    };
    bar.querySelector('.mh-out').onclick = function () {
      if (changed().length && !confirm('Є незбережені правки. Вийти без збереження?')) return;
      setToken(null); window.removeEventListener('beforeunload', leaveGuard); location.reload();
    };

    function clean(html, hadStyle) {
      var t = document.createElement('template'); t.innerHTML = html;
      [].forEach.call(t.content.querySelectorAll('[contenteditable]'), function (e) { e.removeAttribute('contenteditable'); });
      [].forEach.call(t.content.querySelectorAll('.mh-ed,.mh-ch'), function (e) { e.classList.remove('mh-ed', 'mh-ch'); if (!e.className) e.removeAttribute('class'); });
      if (!hadStyle) {
        [].forEach.call(t.content.querySelectorAll('font,span:not([class])'), function (e) { e.replaceWith.apply(e, [].slice.call(e.childNodes)); });
        [].forEach.call(t.content.querySelectorAll('[style]'), function (e) { e.removeAttribute('style'); });
      }
      [].forEach.call(t.content.querySelectorAll('div'), function (e) { e.replaceWith(document.createElement('br'), ...e.childNodes); });
      return t.innerHTML.replace(/(<br>)+$/, '');
    }

    save.onclick = function () {
      var ch = changed(); if (!ch.length) return;
      save.disabled = true; save.textContent = 'Зберігаю…';
      ch.forEach(function (i) { i.pel.innerHTML = clean(i.el.innerHTML, i.hadStyle); });
      [].forEach.call(pdoc.querySelectorAll('.chip'), function (c) {
        if (/^\s*Оновлено/.test(c.textContent) && !c.querySelector('*')) c.textContent = 'Оновлено: ' + today();
      });
      if (!pdoc.querySelector('meta[charset]')) { var mc = pdoc.createElement('meta'); mc.setAttribute('charset', 'UTF-8'); pdoc.head.insertBefore(mc, pdoc.head.firstChild); }
      var out = '<!DOCTYPE html>\n' + pdoc.documentElement.outerHTML + '\n';
      var title = (window.HUB && window.HUB.DOCS[opt.key] && window.HUB.DOCS[opt.key].t) || document.title;
      fetch(api, {
        method: 'PUT', headers: H,
        body: JSON.stringify({ message: 'Правка документа «' + title + '» через редактор хабу (' + ch.length + ' блок.)', content: b64enc(out), sha: sha, branch: BRANCH })
      }).then(function (r) {
        if (r.status === 409 || r.status === 422) throw 'Документ щойно змінив хтось інший. Скопіюйте свої правки, оновіть сторінку і внесіть їх знову.';
        if (r.status === 401) { setToken(null); throw 'Токен більше не діє — підключіть новий і збережіть знову.'; }
        if (r.status === 403 || r.status === 404) throw 'У токена немає права запису. Потрібно Contents: Read and write.';
        if (!r.ok) throw 'GitHub не прийняв збереження (' + r.status + ').';
        return r.json();
      }).then(function (j) {
        sha = j.content.sha;
        ch.forEach(function (i) { i.orig = i.el.innerHTML; });
        refresh(); save.textContent = 'Зберегти';
        toast('Збережено. На сайті з\'явиться приблизно за хвилину.', 5000);
      }).catch(function (e) {
        save.textContent = 'Зберегти'; refresh();
        toast(typeof e === 'string' ? e : 'Немає зв\'язку з GitHub — правки не збережено.', 7000);
      });
    };
    refresh();
    toast('Можна редагувати ' + items.length + ' текстових блоків.', 2500);
  }

  window.MHEditor = { start: start };
})();
