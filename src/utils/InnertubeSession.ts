/**
 * Persistente Session-Bausteine für Innertube — Plan-Phase 1.6.
 *
 * Bisher erzeugte jeder App-Start eine frische Session: neues `visitorData`,
 * kein Player-Cache. Das kostet bei jedem Start einen Player-Download und lässt
 * YouTube die App wie einen Erstbesucher aussehen, was Drosselung und 403er
 * begünstigt.
 */
import {createMMKV} from "react-native-mmkv";

const storage = createMMKV({id: "innertube-session"});

const VISITOR_DATA_KEY = "visitorData";

/**
 * Liefert ein stabiles `visitorData` und legt es beim ersten Aufruf an.
 * Innertube erzeugt es sonst bei jedem Start neu.
 */
export function getPersistentVisitorData(generate: () => string): string {
  const stored = storage.getString(VISITOR_DATA_KEY);

  if (stored) {
    return stored;
  }

  const generated = generate();
  storage.set(VISITOR_DATA_KEY, generated);
  return generated;
}

/** Verwirft die gespeicherte Session-Identität (z. B. beim Abmelden). */
export function resetPersistentSession() {
  storage.remove(VISITOR_DATA_KEY);
}
