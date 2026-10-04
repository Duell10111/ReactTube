/**
 * Zerlegung der Segmentpfade des lokalen Servers — Plan-Phase 6.5.
 *
 * Eigenes Modul, damit es ohne Nativ-Modul und ohne Innertube-Sitzung geprüft
 * werden kann: ein Fehler hier äußert sich nur darin, dass jedes Segment
 * stillschweigend mit 404 beantwortet wird und der Player ohne Meldung stehen
 * bleibt.
 */
/** Was eine Segmentanfrage adressiert. */
export type SabrSegmentRequest =
  | {kind: "init"; formatKey: string}
  | {kind: "segment"; formatKey: string; sequenceNumber: number};

/**
 * Zerlegt einen Segmentpfad des Servers.
 *
 * Erwartet `<root>/init.mp4` oder `<root>/<n>.m4s` je Format, wobei `<root>` das
 * angemeldete Präfix mit abschließendem Schrägstrich ist. Der Formatschlüssel
 * trägt einen Doppelpunkt (`401:`), den das Manifest prozentkodiert und der
 * Server vor dem Ereignis wieder dekodiert — hier kommt er also entschlüsselt an.
 *
 * `null` heißt 404. Eigene Funktion, weil ein Vertippen hier nichts weiter täte
 * als jedes Segment stillschweigend fehlschlagen zu lassen.
 */
export function parseSabrSegmentPath(
  segmentRoot: string,
  path: string,
): SabrSegmentRequest | null {
  if (!path.startsWith(segmentRoot)) {
    return null;
  }

  const parts = path.slice(segmentRoot.length).split("/");

  if (parts.length !== 2) {
    return null;
  }

  const [formatKey, file] = parts;

  if (!formatKey) {
    return null;
  }

  if (file === "init.mp4") {
    return {kind: "init", formatKey};
  }

  const sequence = /^(\d+)\.m4s$/.exec(file);

  if (!sequence) {
    return null;
  }

  return {
    kind: "segment",
    formatKey,
    sequenceNumber: Number(sequence[1]),
  };
}
