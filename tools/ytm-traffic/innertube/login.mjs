import { Innertube, ClientType, UniversalCache } from './ytjs.mjs';
import { writeFileSync } from 'node:fs';

const CREDS = new URL('./creds.json', import.meta.url);
const log = (...a) => { console.log(...a); };

const yt = await Innertube.create({
  client_type: ClientType.TV,
  cache: new UniversalCache(true, './.ytcache'),
});

yt.session.on('auth-pending', (d) => {
  log('\n>>> DEVICE CODE FLOW');
  log('>>> URL :', d.verification_url);
  log('>>> CODE:', d.user_code);
  log('>>> expires_in:', d.expires_in, 'interval:', d.interval, '\n');
});
yt.session.on('auth', ({ credentials }) => {
  writeFileSync(CREDS, JSON.stringify(credentials, null, 2));
  log('>>> AUTH OK, credentials saved. logged_in =', yt.session.logged_in);
  log('>>> scope:', credentials.scope);
  log('>>> expiry:', credentials.expiry_date);
  process.exit(0);
});
yt.session.on('auth-error', (e) => { log('>>> AUTH ERROR', e?.message || e); process.exit(1); });

await yt.session.signIn();
