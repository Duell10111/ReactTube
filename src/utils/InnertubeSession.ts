/**
 * Persistente Session-Identität für Innertube — Plan-Phase 1.6.
 *
 * Ohne Persistenz erzeugt jeder App-Start eine neue Session: neues `visitorData`,
 * kein Player-Cache. Das kostet bei jedem Start einen Player-Download und lässt
 * YouTube die App wie einen Erstbesucher aussehen.
 *
 * **Wichtig:** Es darf nur ein **server-ausgestelltes** `visitorData` gespeichert
 * werden. Ein selbst erzeugtes akzeptiert YouTube nicht — gemessen antworten
 * `VISIONOS`, `ANDROID_VR` und `TV_DOWNGRADED` dann mit `LOGIN_REQUIRED` und
 * `TV_SIMPLY` mit `UNPLAYABLE`, womit auch das HLS-Manifest wegfällt. Lässt man
 * `visitor_data` beim Erzeugen weg, holt sich die Session beim Abruf der
 * InnerTube-Konfiguration selbst einen gültigen Wert; genau der wird hier
 * aufbewahrt.
 */
import {createMMKV} from "react-native-mmkv";

import {UniversalCache} from "@/utils/Youtube";

const storage = createMMKV({id: "innertube-session"});

/**
 * Schlüssel, unter dem youtubei.js seine Session ablegt (`Session.ts`).
 * Der Schlüssel ist fest — der Cache wird unabhängig von den Session-Argumenten
 * wiederverwendet, ein einmal gespeichertes `visitorData` überlebt also auch
 * Änderungen an der Erzeugung.
 */
const SESSION_CACHE_KEY = "innertube_session_data";

const VISITOR_DATA_KEY = "visitorData";
const VISITOR_DATA_CREATED_KEY = "visitorDataCreatedAt";

/** Nach dieser Zeit wird ein neuer Wert geholt, damit er nicht beliebig altert. */
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Gespeichertes `visitorData`, sofern vorhanden und nicht zu alt.
 * `undefined` bedeutet: beim Erzeugen weglassen, damit die Session sich selbst
 * eins besorgt.
 */
export function getStoredVisitorData(): string | undefined {
  const value = storage.getString(VISITOR_DATA_KEY);

  if (!value) {
    return undefined;
  }

  // Ohne Zeitstempel stammt der Wert aus der ersten, fehlerhaften Fassung dieser
  // Datei (selbst erzeugtes visitorData) — `createdAt = 0` sorgt dafür, dass er
  // hier verworfen wird.
  const createdAt = storage.getNumber(VISITOR_DATA_CREATED_KEY) ?? 0;

  if (Date.now() - createdAt > MAX_AGE_MS) {
    resetStoredVisitorData();
    return undefined;
  }

  return value;
}

/**
 * Bewahrt das von der Session mitgebrachte `visitorData` auf.
 * Nur aufrufen mit dem Wert aus `session.context.client.visitorData` einer
 * Session, die **ohne** `visitor_data` erzeugt wurde.
 */
export function storeVisitorData(value?: string) {
  if (!value) {
    return;
  }

  storage.set(VISITOR_DATA_KEY, value);
  storage.set(VISITOR_DATA_CREATED_KEY, Date.now());
}

/** Verwirft die gespeicherte Identität — etwa beim Abmelden oder bei LOGIN_REQUIRED. */
export function resetStoredVisitorData() {
  storage.remove(VISITOR_DATA_KEY);
  storage.remove(VISITOR_DATA_CREATED_KEY);
}

/**
 * Verwirft die zwischengespeicherte Session von youtubei.js.
 *
 * Nötig, wenn kein eigenes `visitorData` vorliegt: sonst stellt `Session.create`
 * die alte Session aus dem Cache wieder her — samt dem darin eingebackenen
 * `visitorData`, das die Ursache eines `LOGIN_REQUIRED` sein kann.
 */
export async function clearInnertubeSessionCache() {
  try {
    await new UniversalCache(true).remove(SESSION_CACHE_KEY);
  } catch {
    // Kein Eintrag vorhanden — nichts zu tun.
  }
}

/**
 * Holt ein `visitorData` direkt beim Besucher-Endpunkt.
 *
 * Bewusst explizit statt als Nebenwirkung des Konfigurationsabrufs: nur so ist
 * erkennbar, ob ein **server-ausgestellter** Wert vorliegt. Ein selbst erzeugter
 * führt dazu, dass `VISIONOS`, `ANDROID_VR` und `TV_DOWNGRADED` mit
 * `LOGIN_REQUIRED` antworten und kein HLS-Manifest mehr kommt.
 *
 * Entspricht SmartTubes `potokennp2/visitor/VisitorApi.kt`.
 */
export async function fetchVisitorData(): Promise<string | undefined> {
  const response = await fetch(
    "https://www.youtube.com/youtubei/v1/visitor_id",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept-Language": "en-US, en;q=0.9",
        Cookie: "SOCS=CAE=",
        Origin: "https://www.youtube.com",
        Referer: "https://www.youtube.com",
        "X-Youtube-Client-Name": "1",
        "X-Youtube-Client-Version": "2.20250213.05.00",
      },
      body: JSON.stringify({
        context: {
          client: {
            clientName: "WEB",
            clientVersion: "2.20250213.05.00",
            hl: "en",
            gl: "US",
          },
        },
      }),
    },
  );

  const json = await response.json();
  return json?.responseContext?.visitorData ?? json?.visitorData ?? undefined;
}
