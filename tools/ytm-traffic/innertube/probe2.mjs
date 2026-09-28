import { readFileSync } from 'node:fs';
const creds = JSON.parse(readFileSync(new URL('./creds.json', import.meta.url), 'utf8'));
const B = creds.access_token;

async function go(label, { host = 'www.youtube.com', path = '/youtubei/v1/browse', name, id, ver, body, auth = true, origin }) {
  const h = { 'Content-Type': 'application/json', 'Accept-Language': 'de-DE,de;q=0.9',
              'X-Youtube-Client-Name': String(id), 'X-Youtube-Client-Version': ver, 'User-Agent': 'Mozilla/5.0' };
  if (auth) h['Authorization'] = `Bearer ${B}`;
  if (origin) { h['Origin'] = origin; h['Referer'] = origin + '/'; }
  const payload = { context: { client: { clientName: name, clientVersion: ver, hl: 'de', gl: 'DE' }, user: {}, request: {} }, ...body };
  let r, t;
  try { r = await fetch(`https://${host}${path}`, { method: 'POST', headers: h, body: JSON.stringify(payload) }); t = await r.text(); }
  catch (e) { return console.log(`ERR   ${label}\n      ${e.message}`); }
  let extra = '';
  try {
    const j = JSON.parse(t);
    if (j.error) extra = `${j.error.status}: ${String(j.error.message).slice(0,80)}` +
      (j.error.details ? ` | details=${JSON.stringify(j.error.details).slice(0,200)}` : '');
    else {
      const li = t.match(/"logged_in","value":"(\d)"/)?.[1] ?? '?';
      const hasContents = !!j.contents;
      extra = `logged_in=${li} contents=${hasContents}`;
    }
  } catch { extra = t.slice(0,100); }
  console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${label}\n      HTTP ${r.status} — ${extra}`);
}

console.log('\n--- A) Liegt es am Client-Namen oder am Endpunkt? (immer MIT Bearer) ---\n');
await go('TVHTML5   + FEwhat_to_watch',        { name:'TVHTML5',   id:7,  ver:'7.20250101.10.00', body:{browseId:'FEwhat_to_watch'} });
await go('TVHTML5   + FEmusic_home',           { name:'TVHTML5',   id:7,  ver:'7.20250101.10.00', body:{browseId:'FEmusic_home'} });
await go('TVHTML5   + FEmusic_liked_playlists',{ name:'TVHTML5',   id:7,  ver:'7.20250101.10.00', body:{browseId:'FEmusic_liked_playlists'} });
await go('WEB       + FEwhat_to_watch',        { name:'WEB',       id:1,  ver:'2.20250101.01.00', body:{browseId:'FEwhat_to_watch'} });
await go('ANDROID   + FEwhat_to_watch',        { name:'ANDROID',   id:3,  ver:'19.09.37',         body:{browseId:'FEwhat_to_watch'} });
await go('ANDROID_MUSIC + FEmusic_home',       { name:'ANDROID_MUSIC', id:21, ver:'7.27.52',      body:{browseId:'FEmusic_home'} });
await go('WEB_REMIX + FEmusic_home (googleapis-Host)',
         { host:'youtubei.googleapis.com', name:'WEB_REMIX', id:67, ver:'1.20250101.01.00', body:{browseId:'FEmusic_home'}, origin:'https://music.youtube.com' });

console.log('\n--- B) Gegenprobe ohne Bearer ---\n');
await go('TVHTML5   + FEmusic_home            (ohne)', { name:'TVHTML5',   id:7,  ver:'7.20250101.10.00', body:{browseId:'FEmusic_home'}, auth:false });
await go('WEB_REMIX + FEmusic_home            (ohne)', { host:'music.youtube.com', name:'WEB_REMIX', id:67, ver:'1.20250101.01.00', body:{browseId:'FEmusic_home'}, auth:false, origin:'https://music.youtube.com' });
await go('WEB       + FEwhat_to_watch         (ohne)', { name:'WEB',       id:1,  ver:'2.20250101.01.00', body:{browseId:'FEwhat_to_watch'}, auth:false });
