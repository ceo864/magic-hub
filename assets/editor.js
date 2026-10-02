/* Magic Hub — редагування документа прямо на сторінці зі збереженням у GitHub.
   Вантажиться тільки коли редактор натиснув «Редагувати» (див. doc.js).

   Як це безпечно для верстки: правимо не живу сторінку, а її вихідний HTML з GitHub.
   Редагованим стає лише той текстовий блок, чий вміст у живій сторінці збігається з вихідним
   байт-у-байт — тобто його не змінили скрипти (квізи, калькулятори, іконки). Зберігаємо
   тільки змінені блоки назад у вихідний HTML, решта файлу лишається як була. */
(function () {
  var REPO = 'ceo864/magic-hub', BRANCH = 'main', TK = 'magichub:gh';
  // Блокові елементи: якщо такий є всередині — це контейнер, а не текстовий блок
  var BLOCKY = 'p,div,section,article,aside,header,footer,nav,main,ul,ol,li,table,thead,tbody,tfoot,tr,td,th,' +
    'dl,dt,dd,h1,h2,h3,h4,h5,h6,blockquote,figure,figcaption,form,input,select,textarea,button,canvas,iframe,video,pre,hr';
  var SKIP = '.mhd,.mh-top,.mh-modal,[data-mh-skip],script,style,title,option,svg';

  // Чи має елемент власний текст (а не лише текст усередині дітей)
  function ownText(el) {
    for (var n = el.firstChild; n; n = n.nextSibling) if (n.nodeType === 3 && n.nodeValue.trim()) return true;
    return false;
  }
  // Усі непорожні текстові вузли всередині елемента, по порядку
  function textNodes(doc, root) {
    var w = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT, null), a = [], n;
    while ((n = w.nextNode())) if (n.nodeValue.trim() && !(n.parentElement && n.parentElement.closest('[data-mh-ui]'))) a.push(n);
    return a;
  }

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
    '.mh-tools{position:absolute;z-index:10001;display:none;gap:4px;background:#0C0E14;padding:4px;border-radius:999px;box-shadow:0 6px 18px rgba(12,14,20,.3)}' +
    '.mh-tools.on{display:flex}' +
    '.mh-tb{all:unset;cursor:pointer;width:26px;height:26px;border-radius:50%;color:#fff;display:grid;place-items:center;font:700 15px/1 Onest,system-ui,sans-serif}' +
    '.mh-tb:hover{background:rgba(255,255,255,.18)}' +
    '@media print{.mh-top,.mh-toast,.mh-tools{display:none}}';
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
      '<input type="text" inputmode="text" spellcheck="false" autocapitalize="off" autocorrect="off" autocomplete="off" data-1p-ignore data-lpignore="true" data-form-type="other" name="mh-token-' + Date.now() + '" placeholder="github_pat_…">' +
      '<div class="mh-err"></div>' +
      '<div class="mh-note">Токен зберігається лише в цьому браузері і дає доступ тільки до репозиторію бази знань.</div>' +
      '<div class="mh-row"><button class="mh-b mh-x">Скасувати</button><button class="mh-b mh-save">Підключити</button></div></div>';
    document.body.appendChild(m);
    var inp = m.querySelector('input'), err = m.querySelector('.mh-err');
    inp.focus();
    m.querySelector('.mh-x').onclick = function () { m.remove(); };
    function go() {
      var t = inp.value.trim(); if (!t) return;
      if (t.length < 40) {
        err.textContent = 'Це не схоже на ключ: усього ' + t.length + ' символів, а має бути близько 90. Скопіюйте ключ кнопкою копіювання на сторінці GitHub і вставте сюди.';
        return;
      }
      if (!/^(github_pat_|ghp_)/.test(t)) {
        err.textContent = 'Ключ має починатися з github_pat_ — схоже, вставилось щось інше.';
        return;
      }
      err.textContent = 'Перевіряю…';
      fetch(api + '?ref=' + BRANCH, { headers: { Authorization: 'Bearer ' + t, Accept: 'application/vnd.github+json' }, cache: 'no-store' })
        .then(function (r) {
          if (r.status === 401) throw 'GitHub не прийняв ключ. Найчастіше це означає, що скопіювалась не вся його довжина або ключ уже видалено.';
          if (r.status === 404) throw 'Токен не бачить репозиторій magic-hub. Перевірте крок 3.';
          if (!r.ok) throw 'GitHub відповів помилкою ' + r.status + '.';
          setToken(t); m.remove(); done(t);
        }).catch(function (e) { err.textContent = typeof e === 'string' ? e : 'Немає зв\'язку з GitHub.'; });
    }
    m.querySelector('.mh-save').onclick = go;
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') go(); });
  }

  /* ── вікно входу ───────────────────────────────────── */
  function askLogin() {
    var m = document.createElement('div'); m.className = 'mh-modal';
    m.innerHTML = '<div class="mh-card"><h3>Вхід для редагування</h3>' +
      '<p style="margin:0 0 16px;color:#4B5160;font-size:14px">Увійдіть своїм акаунтом GitHub — правки зберігатимуться від вашого імені. ' +
      'Вставляти ключі більше не потрібно.</p>' +
      '<div class="mh-row"><button class="mh-b mh-x">Скасувати</button>' +
      '<a class="mh-b mh-save" href="/api/login?returnTo=' + encodeURIComponent(location.pathname + location.search) + '">Увійти через GitHub</a></div></div>';
    document.body.appendChild(m);
    m.querySelector('.mh-x').onclick = function () { m.remove(); };
  }

  /* ── основне ─────────────────────────────────────────── */
  function start(opt) {
    if (document.body.classList.contains('mh-editing')) return;
    var file = opt.key.slice(-1) === '/' ? opt.key + 'index.html' : opt.key;

    fetch('/api/me', { cache: 'no-store', credentials: 'same-origin' })
      .then(function (r) { return r.ok ? r.json() : null; }, function () { return null; })
      .then(function (me) {
        if (me && me.configured && me.auth && me.canWrite) return viaServer(opt, file, me);
        if (me && me.configured && me.auth && !me.canWrite) { try { localStorage.removeItem('magichub:editor'); } catch (e) {} return toast('Акаунт ' + me.login + ' не має права змінювати базу знань.', 6000); }
        if (me && me.configured) return askLogin();
        viaToken(opt, file); // вхід ще не налаштовано — старий спосіб з ключем
      });
  }

  // Режим із входом: усе через наш сервер, ключ у браузер не потрапляє
  function viaServer(opt, file, me) {
    try { localStorage.setItem('magichub:editor', '1'); } catch (e) {}
    toast('Відкриваю документ, ' + (me.name || me.login) + '…', 1500);
    fetch('/api/doc?path=' + encodeURIComponent(file), { cache: 'no-store', credentials: 'same-origin' })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw j.error || 'Помилка ' + r.status; return j; }); })
      .then(function (j) {
        prepare(opt, b64dec(j.content), j.sha, function (out, sha, msg) {
          return fetch('/api/doc', {
            method: 'PUT', credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: file, content: b64enc(out), sha: sha, message: msg })
          }).then(function (r) { return r.json().then(function (j) { if (!r.ok) throw j.error || 'Помилка ' + r.status; return j.sha; }); });
        });
      })
      .catch(function (e) { toast(typeof e === 'string' ? e : 'Немає зв\'язку з сервером.', 6000); });
  }

  // Запасний режим: особистий ключ GitHub у цьому браузері
  function viaToken(opt, file) {
    var api = 'https://api.github.com/repos/' + REPO + '/contents/' + file.split('/').map(encodeURIComponent).join('/');
    var token = getToken();
    if (!token) return askToken(api, function () { viaToken(opt, file); });
    var H = { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json' };
    toast('Відкриваю документ для редагування…', 1500);
    fetch(api + '?ref=' + BRANCH, { headers: H, cache: 'no-store' }).then(function (r) {
      if (r.status === 401) { setToken(null); throw 'Ключ більше не діє — підключіть новий.'; }
      if (!r.ok) throw 'Не вдалося завантажити документ з GitHub (' + r.status + ').';
      return r.json();
    }).then(function (j) {
      prepare(opt, b64dec(j.content), j.sha, function (out, sha, msg) {
        return fetch(api, { method: 'PUT', headers: H, body: JSON.stringify({ message: msg, content: b64enc(out), sha: sha, branch: BRANCH }) })
          .then(function (r) {
            if (r.status === 409 || r.status === 422) throw 'Документ щойно змінив хтось інший. Оновіть сторінку і внесіть правку ще раз.';
            if (r.status === 401) { setToken(null); throw 'Ключ більше не діє — підключіть новий.'; }
            if (r.status === 403 || r.status === 404) throw 'У ключа немає права запису.';
            if (!r.ok) throw 'GitHub не прийняв збереження (' + r.status + ').';
            return r.json().then(function (j) { return j.content.sha; });
          });
      });
    }).catch(function (e) { toast(typeof e === 'string' ? e : 'Немає зв\'язку з GitHub.', 5000); });
  }

  // Спільна частина: зіставляємо живу сторінку з вихідним HTML і вмикаємо редагування
  var origMap = new WeakMap();   // початковий текст блоку
  var pairMap = new WeakMap();   // блок у сторінці → відповідний блок у вихідному файлі

  function scan(pdoc, counters) {
    var cand = [];
    [].forEach.call(document.body.querySelectorAll('*'), function (el) {
      if (!ownText(el)) return;
      if (el.closest(SKIP)) return;
      if (el.querySelector(BLOCKY)) return;
      cand.push(el);
    });
    // лишаємо тільки зовнішній блок: <b> усередині абзацу правиться разом з абзацом
    var set = new Set(cand);
    var outer = cand.filter(function (el) {
      for (var p = el.parentElement; p; p = p.parentElement) if (set.has(p)) return false;
      return true;
    });
    var items = [];
    outer.forEach(function (el) {
      var pel = pairMap.get(el);   // вже зіставляли — не звіряємо вдруге, бо текст міг змінитись
      if (!pel) {
        pel = at(pdoc.body, pathOf(el, document.body));
        if (!pel || pel.tagName !== el.tagName) { if (counters) counters.skipped++; return; }
        // Текст має збігатися з вихідним — тоді ми впевнені, що блок не намальовано скриптом
        if (norm(pel.textContent) !== norm(el.textContent)) { if (counters) counters.skipped++; return; }
        pairMap.set(el, pel);
      }
      if (!origMap.has(el)) origMap.set(el, el.innerHTML);
      items.push({ el: el, pel: pel, hadStyle: /style=/.test(pel.innerHTML) });
    });
    return items;
  }

  function prepare(opt, src, sha, commit) {
    var pdoc = new DOMParser().parseFromString(src, 'text/html');
    var c = { skipped: 0 };
    var items = scan(pdoc, c);
    if (!items.length) return toast('На цій сторінці немає тексту, який можна безпечно правити тут.', 5000);
    enter(pdoc, sha, opt, commit, c.skipped);
  }

  function enter(pdoc, sha, opt, commit, skipped) {
    document.body.classList.add('mh-editing');
    var items = [], dirty = 0;

    var bar = document.createElement('div'); bar.className = 'mh-top'; bar.setAttribute('data-mh-ui', '');
    bar.innerHTML = '<span class="mh-t"><b>Режим редагування.</b> Клацніть на текст у рамці й правте. ' +
      'Біля пунктів списку наведіть мишу — зʼявляться кнопки «＋» і «×».</span>' +
      '<span class="mh-n">0 змін</span><button class="mh-b mh-save" disabled>Зберегти</button>' +
      '<button class="mh-b mh-cancel">Скасувати</button><button class="mh-b mh-out" title="Вийти з режиму редактора">Вийти</button>';
    document.body.appendChild(bar);
    var nEl = bar.querySelector('.mh-n'), save = bar.querySelector('.mh-save');

    // кнопки «додати / видалити пункт» — плавають біля того пункту, на який навели мишу
    var tools = document.createElement('div'); tools.className = 'mh-tools'; tools.setAttribute('data-mh-ui', '');
    tools.innerHTML = '<button class="mh-tb" data-act="add" title="Додати пункт нижче">＋</button>' +
      '<button class="mh-tb" data-act="del" title="Видалити цей пункт">×</button>';
    document.body.appendChild(tools);
    var curLi = null;

    function changed() { return items.filter(function (i) { return i.el.innerHTML !== origMap.get(i.el); }); }
    function refresh() {
      var n = changed().length;
      nEl.textContent = dirty || n
        ? (n ? n + (n === 1 ? ' зміна' : n > 1 && n < 5 ? ' зміни' : ' змін') : '') + (dirty ? (n ? ' + ' : '') + dirty + ' у списках' : '')
        : '0 змін';
      save.disabled = !n && !dirty;
      items.forEach(function (i) { i.el.classList.toggle('mh-ch', i.el.innerHTML !== origMap.get(i.el)); });
    }
    function remap() {
      items = scan(pdoc);
      items.forEach(function (i) { i.el.setAttribute('contenteditable', 'true'); i.el.classList.add('mh-ed'); });
      refresh();
    }
    remap();

    // один набір слухачів на документ — щоб нові пункти працювали без переприсвоєння
    function inEd(e) { return e.target && e.target.closest ? e.target.closest('.mh-ed') : null; }
    document.addEventListener('input', function (e) { if (inEd(e)) refresh(); }, true);
    document.addEventListener('keydown', function (e) {
      var el = inEd(e); if (!el) return;
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); el.blur(); }
    }, true);
    document.addEventListener('paste', function (e) {
      if (!inEd(e)) return;
      e.preventDefault();
      var t = (e.clipboardData || window.clipboardData).getData('text/plain');
      document.execCommand('insertText', false, t);
    }, true);
    document.addEventListener('mouseover', function (e) {
      if (!e.target.closest) return;
      if (e.target.closest('.mh-tools')) return;
      var li = e.target.closest('li.mh-ed');
      if (!li) { tools.classList.remove('on'); return; }
      curLi = li;
      var r = li.getBoundingClientRect();
      tools.style.top = (r.top + window.scrollY - 3) + 'px';
      tools.style.left = (r.right + window.scrollX + 10) + 'px';
      tools.classList.add('on');
    });

    tools.addEventListener('click', function (e) {
      var b = e.target.closest('.mh-tb'); if (!b || !curLi) return;
      var i = items.filter(function (x) { return x.el === curLi; })[0];
      if (!i) return toast('Цей пункт не зіставився з файлом — оновіть сторінку.', 4000);

      if (b.getAttribute('data-act') === 'add') {
        var nl = document.createElement(curLi.tagName); nl.textContent = 'Новий пункт';
        var np = pdoc.createElement(i.pel.tagName); np.textContent = 'Новий пункт';
        curLi.insertAdjacentElement('afterend', nl);
        i.pel.insertAdjacentElement('afterend', np);
        pairMap.set(nl, np);
        dirty++; remap();
        nl.focus();
        var rg = document.createRange(); rg.selectNodeContents(nl);
        var sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(rg);
      } else {
        if (curLi.parentNode.children.length < 2) return toast('Це єдиний пункт списку — краще виправте його текст.', 4000);
        if (!confirm('Видалити пункт «' + curLi.textContent.trim().slice(0, 60) + '»?')) return;
        i.pel.remove(); curLi.remove();
        dirty++; remap();
      }
      tools.classList.remove('on');
    });

    function blockLinks(e) { if (e.target.closest('a') && !e.target.closest('[data-mh-ui],.mhd')) e.preventDefault(); }
    document.addEventListener('click', blockLinks, true);
    function leaveGuard(e) { if (changed().length || dirty) { e.preventDefault(); e.returnValue = ''; } }
    window.addEventListener('beforeunload', leaveGuard);

    bar.querySelector('.mh-cancel').onclick = function () {
      if ((changed().length || dirty) && !confirm('Скасувати всі незбережені правки?')) return;
      window.removeEventListener('beforeunload', leaveGuard); location.reload();
    };
    bar.querySelector('.mh-out').onclick = function () {
      if ((changed().length || dirty) && !confirm('Є незбережені правки. Вийти без збереження?')) return;
      setToken(null); window.removeEventListener('beforeunload', leaveGuard);
      location.href = '/api/logout?returnTo=' + encodeURIComponent(location.pathname);
    };

    function clean(html, hadStyle) {
      var t = document.createElement('template'); t.innerHTML = html;
      [].forEach.call(t.content.querySelectorAll('[contenteditable]'), function (e) { e.removeAttribute('contenteditable'); });
      [].forEach.call(t.content.querySelectorAll('.mh-ed,.mh-ch'), function (e) { e.classList.remove('mh-ed', 'mh-ch'); if (!e.className) e.removeAttribute('class'); });
      if (!hadStyle) {
        [].forEach.call(t.content.querySelectorAll('font,span:not([class])'), function (e) { e.replaceWith.apply(e, [].slice.call(e.childNodes)); });
        [].forEach.call(t.content.querySelectorAll('[style]'), function (e) { e.removeAttribute('style'); });
      }
      [].forEach.call(t.content.querySelectorAll('div'), function (e) { e.replaceWith.apply(e, [document.createElement('br')].concat([].slice.call(e.childNodes))); });
      return t.innerHTML.replace(/(<br>)+$/, '');
    }

    save.onclick = function () {
      var ch = changed();
      if (!ch.length && !dirty) return;
      save.disabled = true; save.textContent = 'Зберігаю…';
      var failed = 0;
      ch.forEach(function (i) {
        var live = textNodes(document, i.el), pris = textNodes(pdoc, i.pel);
        if (live.length === pris.length) {                    // звичайний випадок: міняємо лише текст
          for (var k = 0; k < live.length; k++) pris[k].nodeValue = live[k].nodeValue;
        } else if (!/<svg|data-lucide/i.test(i.pel.innerHTML) && !/<svg|data-lucide/i.test(i.el.innerHTML)) {
          i.pel.innerHTML = clean(i.el.innerHTML, i.hadStyle); // змінилось форматування, іконок немає
        } else {
          failed++;                                           // іконки + змінена структура — не чіпаємо
        }
      });
      if (failed) toast(failed + ' блок(и) з іконками не збереглись: приберіть зміну форматування всередині них.', 7000);
      [].forEach.call(pdoc.querySelectorAll('.chip'), function (c) {
        if (/^\s*Оновлено/.test(c.textContent) && !c.querySelector('*')) c.textContent = 'Оновлено: ' + today();
      });
      if (!pdoc.querySelector('meta[charset]')) { var mc = pdoc.createElement('meta'); mc.setAttribute('charset', 'UTF-8'); pdoc.head.insertBefore(mc, pdoc.head.firstChild); }
      var out = '<!DOCTYPE html>\n' + pdoc.documentElement.outerHTML + '\n';
      var title = (window.HUB && window.HUB.DOCS[opt.key] && window.HUB.DOCS[opt.key].t) || document.title;
      var what = (ch.length ? ch.length + ' блок.' : '') + (dirty ? (ch.length ? ', ' : '') + dirty + ' у списках' : '');
      commit(out, sha, 'Правка документа «' + title + '» через редактор хабу (' + what + ')')
        .then(function (newSha) {
          if (newSha) sha = newSha;
          items.forEach(function (i) { origMap.set(i.el, i.el.innerHTML); });
          dirty = 0; refresh(); save.textContent = 'Зберегти';
          toast('Збережено. На сайті зʼявиться приблизно за хвилину.', 5000);
        })
        .catch(function (e) {
          save.textContent = 'Зберегти'; refresh();
          toast(typeof e === 'string' ? e : 'Збереження не вдалося.', 7000);
        });
    };
    refresh();
    toast('Можна редагувати ' + items.length + ' текстових блоків' +
      (skipped ? '. Ще ' + skipped + ' малює скрипт — їх правлю не тут' : '') + '.', 3000);
  }

  window.MHEditor = { start: start };
})();
