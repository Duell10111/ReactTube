// Löst den Pfad zum lokalen YouTube.js-Build auf.
// Überschreibbar per Umgebungsvariable: YTJS=/pfad/zu/YouTube.js node login.mjs
const base = process.env.YTJS ?? "/Users/kospaeth/Git/YouTube.js";
export const { Innertube, ClientType, UniversalCache } = await import(
  `${base}/dist/src/platform/node.js`
);
