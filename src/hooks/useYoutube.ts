import {useEffect, useState} from "react";

import {Innertube, UniversalCache} from "../utils/Youtube";

import {useAppData} from "@/context/AppDataContext";
import {
  clearInnertubeSessionCache,
  fetchVisitorData,
  getStoredVisitorData,
  storeVisitorData,
} from "@/utils/InnertubeSession";
import Logger from "@/utils/Logger";
import {parseLanguage} from "@/utils/YTLanguages";

const LOGGER = Logger.extend("INNERTUBE");

/**
 * Besorgt die Session-Identität — Plan-Phase 1.6.
 *
 * `visitorData` muss **server-ausgestellt** sein; ein selbst erzeugtes führt dazu,
 * dass die HLS-fähigen Clients mit `LOGIN_REQUIRED` antworten. Deshalb wird es hier
 * explizit geholt statt dem Konfigurationsabruf überlassen — und der Session-Cache
 * von youtubei.js wird verworfen, wenn kein eigener Wert vorliegt, weil dieser sonst
 * eine alte Identität wieder einspielt.
 */
async function resolveVisitorData(): Promise<{
  value?: string;
  source: "gespeichert" | "neu geholt" | "nicht verfügbar";
}> {
  const stored = getStoredVisitorData();

  if (stored) {
    return {value: stored, source: "gespeichert"};
  }

  await clearInnertubeSessionCache();

  try {
    const fetched = await fetchVisitorData();

    if (fetched) {
      storeVisitorData(fetched);
      return {value: fetched, source: "neu geholt"};
    }
  } catch (error) {
    LOGGER.warn("visitorData konnte nicht geholt werden: ", error);
  }

  // Ohne eigenen Wert übernimmt youtubei.js die Beschaffung beim Konfigurationsabruf.
  return {source: "nicht verfügbar"};
}

export default function useYoutube() {
  const [youtube, setYoutube] = useState<Innertube>();
  const {appSettings} = useAppData();
  const language = parseLanguage(appSettings);

  useEffect(() => {
    resolveVisitorData()
      .then(async visitor => {
        const instance = await Innertube.create({
          lang: language.key,
          // Hält das Player-Skript über App-Starts hinweg.
          cache: new UniversalCache(true),
          visitor_data: visitor.value,
          // cookie: "SOCS=CAISEwgDEgk2NjUyNDgyNDcaAmRlIAEaBgiAuY-2Bg",
        });

        LOGGER.debug(
          `Innertube bereit · Player sts ${instance.session.player?.signature_timestamp ?? "?"} · ` +
            `visitorData ${visitor.source} (${instance.session.context.client.visitorData?.slice(0, 16) ?? "?"}…)`,
        );
        setYoutube(instance);
      })
      .catch(e => LOGGER.warn("Innertube-Erzeugung fehlgeschlagen: ", e));
  }, []);

  return youtube;
}
