import { readFileSync } from 'node:fs';
const creds = JSON.parse(readFileSync(new URL('./creds.json', import.meta.url), 'utf8'));
const B = creds.access_token;

function loggedIn(j) {
  const stp = j?.responseContext?.serviceTrackingParams ?? [];
  for (const s of stp) for (const p of (s.params ?? [])) if (p.key === 'logged_in') return p.value;
  return '?';
}
function titles(j, max = 4) {
  const out = [];
  const walk = (o, d = 0) => {
    if (out.length >= max || d > 14 || !o || typeof o !== 'object') return;
    if (Array.isArray(o)) { for (const x of o) walk(x, d + 1); return; }
    for (const [k, v] of Object.entries(o)) {
      if (out.length >= max) return;
      if ((k === 'title' || k === 'text') && typeof v === 'string' && v.trim() && v.length < 60) out.push(v);
      else if (k === 'title' && v?.runs?.[0]?.text) out.push(v.runs[0].text);
      else walk(v, d + 1);
    }
  };
  walk(j);
  return [...new Set(out)].slice(0, max);
}

async function tv(label, body, path = '/youtubei/v1/browse', auth = true) {
  const h = { 'Content-Type': 'application/json', 'Accept-Language': 'de-DE,de;q=0.9',
              'X-Youtube-Client-Name': '7', 'X-Youtube-Client-Version': '7.20250101.10.00', 'User-Agent': 'Mozilla/5.0' };
  if (auth) h['Authorization'] = `Bearer ${B}`;
  const payload = { context: { client: { clientName: 'TVHTML5', clientVersion: '7.20250101.10.00', hl: 'de', gl: 'DE' }, user: {}, request: {} }, ...body };
  const r = await fetch(`https://www.youtube.com${path}`, { method: 'POST', headers: h, body: JSON.stringify(payload) });
  const t = await r.text();
  let info;
  try {
    const j = JSON.parse(t);
    info = j.error ? `${j.error.status}` : `logged_in=${loggedIn(j)} | ${JSON.stringify(titles(j))}`;
  } catch { info = t.slice(0, 80); }
  console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${label.padEnd(42)} HTTP ${r.status} — ${info}`);
}

console.log('\n--- TVHTML5 + OAuth: welche FEmusic_*-BrowseIDs tragen? ---\n');
for (const id of ['FEmusic_home','FEmusic_library_landing','FEmusic_liked_playlists','FEmusic_liked_videos',
                  'FEmusic_library_corpus_track_artists','FEmusic_history','FEmusic_explore','FEmusic_charts',
                  'FEmusic_new_releases','FEmusic_moods_and_genres','FEmusic_listening_review'])
  await tv(id, { browseId: id });

console.log('\n--- TVHTML5 + OAuth: weitere Endpunkte ---\n');
await tv('next (Musikvideo, Queue)',  { videoId: 'lgmsJx0V2tM' }, '/youtubei/v1/next');
await tv('player (Musikvideo)',       { videoId: 'lgmsJx0V2tM', contentCheckOk: true, racyCheckOk: true }, '/youtubei/v1/player');
await tv('search "daft punk"',        { query: 'daft punk' }, '/youtubei/v1/search');
await tv('account/accounts_list',     { }, '/youtubei/v1/account/accounts_list');
await tv('guide',                     { }, '/youtubei/v1/guide');

console.log('\n--- Gegenprobe: FEmusic_liked_playlists OHNE Token ---\n');
await tv('FEmusic_liked_playlists (ohne)', { browseId: 'FEmusic_liked_playlists' }, '/youtubei/v1/browse', false);
