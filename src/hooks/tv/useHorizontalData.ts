import {useCallback, useEffect, useRef, useState} from "react";
import {Helpers} from "youtubei.js";

import {useYoutubeTVContext} from "@/context/YoutubeContext";
import {parseObservedArray} from "@/extraction/ArrayExtraction";
import {HorizontalData} from "@/extraction/ShelfExtraction";
import {ElementData} from "@/extraction/Types";
import Logger from "@/utils/Logger";
import {HorizontalListContinuation, YTNodes} from "@/utils/Youtube";

const LOGGER = Logger.extend("HORIZONTAL_DATA");

/** Nach so vielen Fehlversuchen in Folge wird die Reihe aufgegeben. */
const MAX_FAILURES = 3;

/**
 * Das Fortsetzungs-Token eines Regals, falls es eines gibt.
 *
 * Dieselbe Unterscheidung, die `tv.fetchContinuationData` intern trifft — hier
 * aber als Frage statt als Ausführung: die Methode wirft, wenn kein Token da
 * ist, und ein Regal ohne Fortsetzung ist der Normalfall, kein Fehler.
 */
function getContinuationToken(node?: Helpers.YTNode): string | undefined {
  if (!node) {
    return undefined;
  }

  if (node.is(YTNodes.HorizontalList)) {
    return node.continuations?.[0]?.continuation;
  }

  if (node.is(HorizontalListContinuation)) {
    return node.continuation;
  }

  return undefined;
}

export default function useHorizontalData(data: HorizontalData) {
  const [elements, setElements] = useState<ElementData[]>(data.parsedData);
  const continuation = useRef<HorizontalListContinuation>(undefined);
  const youtube = useYoutubeTVContext();

  /**
   * Ob gerade eine Anfrage läuft. `onEndReached` einer Liste feuert mehrfach,
   * solange das Ende sichtbar ist — ohne diese Sperre laufen drei, vier
   * identische Anfragen gleichzeitig.
   */
  const loading = useRef(false);

  /** Gesetzt, sobald feststeht, dass es nichts mehr zu holen gibt. */
  const exhausted = useRef(false);

  /**
   * Fehlversuche in Folge. Ein einmaliger Netzfehler soll die Reihe nicht
   * stilllegen — eine dauerhaft kaputte aber auch nicht bei jedem Scrollen
   * erneut angefragt werden, denn `onEndReached` feuert, solange das Ende
   * sichtbar bleibt.
   */
  const failures = useRef(0);

  useEffect(() => {
    // Reset elements if Horizontal Data changes
    setElements(data.parsedData);
    continuation.current = undefined;
    loading.current = false;
    exhausted.current = false;
    failures.current = 0;
  }, [data]);

  const fetchMore = useCallback(() => {
    if (loading.current || exhausted.current || !youtube) {
      return;
    }

    const node: Helpers.YTNode | undefined =
      continuation.current ??
      (data.originalNode.is(YTNodes.Shelf)
        ? (data.originalNode.content ?? undefined)
        : undefined);

    // Ein Regal ohne Fortsetzung ist der Normalfall — YouTube liefert sie nur
    // für einen Teil der Reihen. Vorher wurde trotzdem gefragt; die Methode
    // warf dann „No continuation data available", und weil niemand die Zusage
    // abfing, landete das als Uncaught Promise in der Konsole.
    if (!getContinuationToken(node)) {
      exhausted.current = true;
      LOGGER.debug(
        `Keine weitere Fortsetzung für ${data.originalNode.type} — Ende erreicht.`,
      );
      return;
    }

    loading.current = true;

    youtube.tv
      .fetchContinuationData(node!)
      .then(result => {
        if (!result?.is(HorizontalListContinuation)) {
          exhausted.current = true;
          LOGGER.debug(
            `Unerwarteter Fortsetzungstyp: ${result?.type ?? "keiner"}`,
          );
          return;
        }

        continuation.current = result;
        failures.current = 0;

        const fetched = result.items;

        if (!fetched?.length) {
          exhausted.current = true;
          LOGGER.debug("Fortsetzung ohne weitere Einträge — Ende erreicht.");
          return;
        }

        setElements(existingElements => {
          // Doppelte herausfiltern: YouTube wiederholt am Übergang gern Einträge.
          const items = parseObservedArray(fetched).filter(
            item => existingElements.findIndex(i => i.id === item.id) === -1,
          );

          return items.length
            ? [...existingElements, ...items]
            : existingElements;
        });
      })
      .catch(error => {
        // Nicht weiterreichen: ein fehlgeschlagenes Nachladen darf eine Reihe
        // kosten, nicht die ganze Startseite.
        failures.current += 1;

        if (failures.current >= MAX_FAILURES) {
          exhausted.current = true;
        }

        LOGGER.warn(
          `Nachladen fehlgeschlagen (${data.originalNode.type}, Versuch ` +
            `${failures.current}/${MAX_FAILURES}): ${String(
              error?.message ?? error,
            )}`,
        );
      })
      .finally(() => {
        loading.current = false;
      });
  }, [data, youtube]);

  return {elements, fetchMore};
}
