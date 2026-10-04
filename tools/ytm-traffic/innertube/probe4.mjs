import { Innertube, ClientType, UniversalCache } from './ytjs.mjs';
import { readFileSync } from 'node:fs';
const creds = JSON.parse(readFileSync(new URL('./creds.json', import.meta.url), 'utf8'));
const rec = (ok, l, d) => console.log(`${ok ? 'PASS' : 'FAIL'}  ${l.padEnd(46)} ${d}`);

console.log('\n--- Weg A: angemeldete Session, Musik-Bibliothek über client "TV" ---\n');
const auth = await Innertube.create({ client_type: ClientType.TV, cache: new UniversalCache(true, './.ytcache') });
await auth.session.signIn(creds);
for (const id of ['FEmusic_liked_playlists', 'FEmusic_liked_videos']) {
  try {
    const r = await auth.actions.execute('/browse', { browseId: id, client: 'TV', parse: false });
    rec(true, `actions.execute /browse ${id}`, `ok, ${JSON.stringify(r).length} B`);
  } catch (e) { rec(false, `actions.execute /browse ${id}`, `${e.message}`.slice(0, 90)); }
}
try {
  const lib = await auth.getLibrary();
  rec(true, 'auth.getLibrary() (TV, Video-Bibliothek)', `ok`);
} catch (e) { rec(false, 'auth.getLibrary()', `${e.message}`.slice(0, 90)); }

console.log('\n--- Weg B: zweite, NICHT angemeldete Session für öffentliche Musikdaten ---\n');
const anon = await Innertube.create({ client_type: ClientType.WEB, cache: new UniversalCache(true, './.ytcache-anon'), retrieve_player: false });
const probe = async (n, f) => { try { const r = await f(); const c = r?.sections?.length ?? r?.contents?.length ?? r?.results?.length ?? '?'; rec(true, n, `ok, ${c} Sections/Treffer`); } catch (e) { rec(false, n, `${e.constructor.name}: ${String(e.message).slice(0,80)}`); } };
await probe('anon.music.getHomeFeed()',        () => anon.music.getHomeFeed());
await probe('anon.music.getExplore()',         () => anon.music.getExplore());
await probe('anon.music.search("daft punk")',  () => anon.music.search('daft punk'));
await probe('anon.music.getSearchSuggestions', () => anon.music.getSearchSuggestions('daft'));
await probe('anon.music.getUpNext(videoId)',   () => anon.music.getUpNext('lgmsJx0V2tM'));
await probe('anon.music.getAlbum(MPREb…)',     () => anon.music.getPlaylist('RDCLAK5uy_kmPRjHDECIcuVwnKs9vc4LyAmnSg4LiOx0'));
