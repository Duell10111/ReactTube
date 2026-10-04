import { Innertube, ClientType, UniversalCache } from './ytjs.mjs';
import { readFileSync } from 'node:fs';

const creds = JSON.parse(readFileSync(new URL('./creds.json', import.meta.url), 'utf8'));
const results = [];
const rec = (name, ok, detail) => {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}\n      ${detail}`);
};

// ---------- Teil 1: rohe InnerTube-Requests, Bearer aus dem TV-Flow ----------
const BEARER = creds.access_token;

async function raw(label, { host, path, clientName, clientVersion, body, auth = true }) {
  const headers = {
    'Content-Type': 'application/json',
    'Accept-Language': 'en-US,en;q=0.9',
    'X-Youtube-Client-Name': String(clientName.id),
    'X-Youtube-Client-Version': clientVersion,
    'User-Agent': 'Mozilla/5.0',
  };
  if (auth) headers['Authorization'] = `Bearer ${BEARER}`;
  if (host === 'music.youtube.com' || clientName.name === 'WEB_REMIX') {
    headers['Origin'] = 'https://music.youtube.com';
    headers['Referer'] = 'https://music.youtube.com/';
  }
  const payload = {
    context: { client: { clientName: clientName.name, clientVersion, hl: 'de', gl: 'DE' }, user: {}, request: {} },
    ...body,
  };
  let res, text;
  try {
    res = await fetch(`https://${host}${path}`, { method: 'POST', headers, body: JSON.stringify(payload) });
    text = await res.text();
  } catch (e) {
    return rec(label, false, `network: ${e.message}`);
  }
  let hint = '';
  try {
    const j = JSON.parse(text);
    if (j.error) hint = `error ${j.error.code} ${j.error.status}: ${String(j.error.message).slice(0, 110)}`;
    else {
      const rc = j.responseContext ?? {};
      const loggedIn = JSON.stringify(j).match(/"logged_in","value":"(\d)"/)?.[1]
        ?? JSON.stringify(rc).match(/logged_in.{0,20}?(\d)/)?.[1] ?? '?';
      hint = `keys=[${Object.keys(j).slice(0, 6).join(',')}] logged_in=${loggedIn}`;
    }
  } catch { hint = text.slice(0, 120); }
  rec(label, res.ok, `HTTP ${res.status} — ${hint}`);
}

const TV   = { name: 'TVHTML5', id: 7 };
const WEBR = { name: 'WEB_REMIX', id: 67 };
const IOSM = { name: 'IOS_MUSIC', id: 26 };

console.log('\n########## Teil 1: rohe Requests mit TV-Bearer ##########\n');
await raw('TVHTML5   /youtubei/v1/browse  FEwhat_to_watch  (Kontrolle: Token gültig?)',
  { host: 'www.youtube.com', path: '/youtubei/v1/browse', clientName: TV,
    clientVersion: '7.20250101.10.00', body: { browseId: 'FEwhat_to_watch' } });

await raw('WEB_REMIX /youtubei/v1/browse  FEmusic_home',
  { host: 'music.youtube.com', path: '/youtubei/v1/browse', clientName: WEBR,
    clientVersion: '1.20250101.01.00', body: { browseId: 'FEmusic_home' } });

await raw('WEB_REMIX /youtubei/v1/browse  FEmusic_liked_playlists (auth-pflichtig)',
  { host: 'music.youtube.com', path: '/youtubei/v1/browse', clientName: WEBR,
    clientVersion: '1.20250101.01.00', body: { browseId: 'FEmusic_liked_playlists' } });

await raw('WEB_REMIX /youtubei/v1/browse  FEmusic_liked_playlists  OHNE Token (Vergleich)',
  { host: 'music.youtube.com', path: '/youtubei/v1/browse', clientName: WEBR,
    clientVersion: '1.20250101.01.00', body: { browseId: 'FEmusic_liked_playlists' }, auth: false });

await raw('IOS_MUSIC /youtubei/v1/browse  FEmusic_home  (wie das iPad)',
  { host: 'youtubei.googleapis.com', path: '/youtubei/v1/browse', clientName: IOSM,
    clientVersion: '9.39.2', body: { browseId: 'FEmusic_home' } });

await raw('WEB_REMIX /youtubei/v1/music/get_search_suggestions',
  { host: 'music.youtube.com', path: '/youtubei/v1/music/get_search_suggestions', clientName: WEBR,
    clientVersion: '1.20250101.01.00', body: { input: 'daft' } });

// ---------- Teil 2: über YouTube.js' Music-Client ----------
console.log('\n########## Teil 2: YouTube.js Music-Client ##########\n');
const yt = await Innertube.create({ client_type: ClientType.TV, cache: new UniversalCache(true, './.ytcache') });
await yt.session.signIn(creds);
console.log('session.logged_in =', yt.session.logged_in, '\n');

const probe = async (name, fn) => {
  try {
    const r = await fn();
    const n = r?.contents?.length ?? r?.sections?.length ?? r?.items?.length ?? r?.length ?? '?';
    rec(name, true, `ok, ${n} Einträge/Sections`);
  } catch (e) {
    rec(name, false, `${e.constructor.name}: ${String(e.message).slice(0, 150)}`);
  }
};

await probe('music.getHomeFeed()',        () => yt.music.getHomeFeed());
await probe('music.getLibrary()',         () => yt.music.getLibrary());
await probe('music.getSearchSuggestions', () => yt.music.getSearchSuggestions('daft'));
await probe('music.search("daft punk")',  () => yt.music.search('daft punk'));
await probe('music.getUpNext(video)',     () => yt.music.getUpNext('lgmsJx0V2tM'));

console.log('\n########## Zusammenfassung ##########');
for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}`);
