/* Magic Hub — серверна частина редактора на Cloudflare Pages Functions.
   Дає вхід через GitHub замість вставляння ключа вручну.

   Ключ доступу зберігається в HttpOnly-куках: сторінка його не бачить і скрипти вкрасти не можуть.
   Усі звернення до GitHub ідуть звідси, а не з браузера.

   Потрібні змінні оточення проєкту Pages:
     GITHUB_CLIENT_ID     — Client ID OAuth-застосунку
     GITHUB_CLIENT_SECRET — Client secret (додавати як Secret, не як звичайну змінну)
   Необов'язкові: REPO (типово ceo864/magic-hub), BRANCH (типово main)
*/

const COOKIE = 'mh_gh';
const STATE_COOKIE = 'mh_state';
const UA = { 'User-Agent': 'magic-hub-editor', Accept: 'application/vnd.github+json' };

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });

const cookie = (name, value, maxAge) =>
  `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;

function readCookie(req, name) {
  const raw = req.headers.get('Cookie') || '';
  const hit = raw.split(';').map(s => s.trim()).find(s => s.startsWith(name + '='));
  return hit ? decodeURIComponent(hit.slice(name.length + 1)) : null;
}

// Повертаємо тільки на свої ж сторінки, щоб через returnTo не можна було перекинути на чужий сайт
const safeReturn = (v) => (typeof v === 'string' && /^\/[A-Za-z0-9_\-./?#=&%]*$/.test(v) && !v.startsWith('//') ? v : '/');
const safePath = (p) => typeof p === 'string' && /^[A-Za-z0-9_\-./]+\.html$/.test(p) && !p.includes('..');

const repoOf = (env) => env.REPO || 'ceo864/magic-hub';
const branchOf = (env) => env.BRANCH || 'main';

async function gh(url, token, init = {}) {
  const r = await fetch(url, { ...init, headers: { ...UA, Authorization: 'Bearer ' + token, ...(init.headers || {}) } });
  return r;
}

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const route = url.pathname.replace(/^\/api\/?/, '').replace(/\/$/, '');
  const token = readCookie(request, COOKIE);

  // ── вхід ──────────────────────────────────────────────────────────
  if (route === 'login') {
    if (!env.GITHUB_CLIENT_ID) return json({ error: 'Вхід не налаштовано: немає GITHUB_CLIENT_ID у налаштуваннях проєкту.' }, 500);
    const state = crypto.randomUUID();
    const back = safeReturn(url.searchParams.get('returnTo'));
    const auth = new URL('https://github.com/login/oauth/authorize');
    auth.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
    auth.searchParams.set('redirect_uri', url.origin + '/api/callback');
    auth.searchParams.set('scope', 'public_repo');
    auth.searchParams.set('state', state);
    return new Response(null, {
      status: 302,
      headers: {
        Location: auth.toString(),
        'Set-Cookie': cookie(STATE_COOKIE, encodeURIComponent(state + '|' + back), 600),
        'Cache-Control': 'no-store'
      }
    });
  }

  if (route === 'callback') {
    const code = url.searchParams.get('code');
    const given = url.searchParams.get('state');
    const saved = readCookie(request, STATE_COOKIE) || '';
    const [state, back] = saved.split('|');
    if (!code || !given || given !== state) return json({ error: 'Вхід не вдався: сторінку відкрито не з початку. Спробуйте ще раз.' }, 400);

    const r = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'User-Agent': 'magic-hub-editor' },
      body: JSON.stringify({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: url.origin + '/api/callback'
      })
    });
    const data = await r.json().catch(() => ({}));
    if (!data.access_token) return json({ error: 'GitHub не видав доступ: ' + (data.error_description || data.error || 'невідома причина') }, 400);

    return new Response(null, {
      status: 302,
      headers: [
        ['Location', safeReturn(back)],
        ['Set-Cookie', cookie(COOKIE, encodeURIComponent(data.access_token), 60 * 60 * 24 * 30)],
        ['Set-Cookie', cookie(STATE_COOKIE, '', 0)],
        ['Cache-Control', 'no-store']
      ]
    });
  }

  if (route === 'logout') {
    return new Response(null, { status: 302, headers: { Location: safeReturn(url.searchParams.get('returnTo')), 'Set-Cookie': cookie(COOKIE, '', 0) } });
  }

  // ── хто я ─────────────────────────────────────────────────────────
  if (route === 'me') {
    if (!token) return json({ auth: false, configured: !!env.GITHUB_CLIENT_ID });
    const r = await gh('https://api.github.com/user', token);
    if (!r.ok) return json({ auth: false, configured: true });
    const u = await r.json();
    const p = await gh(`https://api.github.com/repos/${repoOf(env)}/collaborators/${u.login}/permission`, token);
    let canWrite = false;
    if (p.ok) { const d = await p.json(); canWrite = d.permission === 'admin' || d.permission === 'write' || d.permission === 'maintain'; }
    return json({ auth: true, login: u.login, name: u.name, avatar: u.avatar_url, canWrite });
  }

  // ── документ ──────────────────────────────────────────────────────
  if (route === 'doc') {
    if (!token) return json({ error: 'Спочатку увійдіть через GitHub.' }, 401);
    const repo = repoOf(env), branch = branchOf(env);

    if (request.method === 'GET') {
      const path = url.searchParams.get('path');
      if (!safePath(path)) return json({ error: 'Невідомий документ.' }, 400);
      const r = await gh(`https://api.github.com/repos/${repo}/contents/${path}?ref=${branch}`, token);
      if (r.status === 401) return json({ error: 'Сесія застаріла — увійдіть знову.' }, 401);
      if (!r.ok) return json({ error: 'GitHub не віддав документ (' + r.status + ').' }, 502);
      const d = await r.json();
      return json({ content: d.content, sha: d.sha });
    }

    if (request.method === 'PUT') {
      const body = await request.json().catch(() => ({}));
      if (!safePath(body.path) || !body.content || !body.sha) return json({ error: 'Неповні дані для збереження.' }, 400);
      const r = await gh(`https://api.github.com/repos/${repo}/contents/${body.path}`, token, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: String(body.message || 'Правка через редактор хабу').slice(0, 200), content: body.content, sha: body.sha, branch })
      });
      const d = await r.json().catch(() => ({}));
      if (r.status === 409 || r.status === 422) return json({ error: 'Документ щойно змінив хтось інший. Оновіть сторінку і внесіть правку ще раз.' }, 409);
      if (r.status === 403 || r.status === 404) return json({ error: 'У вашого акаунта немає права змінювати цей репозиторій.' }, 403);
      if (!r.ok) return json({ error: 'GitHub не прийняв збереження (' + r.status + ').' }, 502);
      return json({ sha: d.content && d.content.sha });
    }

    return json({ error: 'Метод не підтримується.' }, 405);
  }

  return json({ error: 'Невідомий запит.' }, 404);
}
