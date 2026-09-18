/**
 * Blendet die Require-Cycle-Warnungen aus `youtubei.js` aus.
 *
 * **Warum das nötig ist:** Metro warnt im Entwicklungsmodus vor jedem zyklischen
 * `require`. Für Pakete unter `node_modules` unterdrücken die meisten Projekte das
 * über `__requireCycleIgnorePatterns`; React Native selbst setzt **keinen**
 * Standardwert, also warnt Metro hier für alles.
 *
 * Der Fork ist seit Plan-Phase 1.1 als `file:`-Dependency eingebunden und liegt
 * damit unter `../../YouTube.js/dist/…` statt unter `node_modules` — deshalb
 * erscheinen ausgerechnet seine Zyklen, gut 90 Stück bei jedem Start.
 *
 * **Warum nicht reparieren:** die Zyklen sind Architektur von youtubei.js, nicht
 * ein Versehen im Fork. `parser/index.js` → `parser.js` → `nodes.js` → die
 * Knotenklasse → zurück auf `parser.js`: jede der gut 450 Knotenklassen ruft beim
 * Parsen `Parser.parse()` auf, und `Parser` muss zum Auflösen die Knotenliste
 * kennen. Das aufzulösen hieße, die Knotenregistrierung zur Laufzeit zu
 * injizieren — ein Eingriff quer durch die Bibliothek, der sie bei jedem
 * Upstream-Merge wieder aufreißt. Der Zyklus ist zudem harmlos: alle Beteiligten
 * greifen erst beim Parsen aufeinander zu, nicht beim Laden des Moduls.
 *
 * Das Muster ist bewusst eng gefasst — Zyklen im App-Code werden weiterhin
 * gemeldet.
 *
 * Muss **vor** allen anderen Importen ausgeführt werden, deshalb steht der Import
 * in `App.tsx` an erster Stelle.
 */
const IGNORE_PATTERNS = [
  // Alles unterhalb von node_modules (das, was React Native selbst nicht setzt).
  /(^|[/\\])node_modules([/\\]|$)/,
  // Der Fork, der per file:-Dependency außerhalb von node_modules liegt.
  /YouTube\.js[/\\]dist[/\\]/,
];

declare const __METRO_GLOBAL_PREFIX__: string | undefined;

const prefix =
  typeof __METRO_GLOBAL_PREFIX__ === "string" ? __METRO_GLOBAL_PREFIX__ : "";

// @ts-expect-error Der Schlüssel ist eine Metro-Laufzeitabsprache, kein RN-API.
global[`${prefix}__requireCycleIgnorePatterns`] = IGNORE_PATTERNS;

export {};
