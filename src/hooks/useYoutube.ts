import {useEffect, useState} from "react";

import {Innertube, ProtoUtils, UniversalCache, Utils} from "../utils/Youtube";

import {useAppData} from "@/context/AppDataContext";
import {getPersistentVisitorData} from "@/utils/InnertubeSession";
import Logger from "@/utils/Logger";
import {parseLanguage} from "@/utils/YTLanguages";

const LOGGER = Logger.extend("INNERTUBE");

export default function useYoutube() {
  const [youtube, setYoutube] = useState<Innertube>();
  const {appSettings} = useAppData();
  const language = parseLanguage(appSettings);

  useEffect(() => {
    // Plan-Phase 1.6: Session über App-Starts hinweg wiederverwenden.
    // - UniversalCache hält das Player-Skript (sonst wird es bei jedem Start neu geladen)
    // - stabiles visitorData, statt bei jedem Start ein neues zu erzeugen
    const visitorData = getPersistentVisitorData(() =>
      ProtoUtils.encodeVisitorData(
        Utils.generateRandomString(11),
        Math.floor(Date.now() / 1000),
      ),
    );

    Innertube.create({
      lang: language.key,
      cache: new UniversalCache(true),
      visitor_data: visitorData,
      // cookie: "SOCS=CAISEwgDEgk2NjUyNDgyNDcaAmRlIAEaBgiAuY-2Bg",
    })
      .then(instance => {
        LOGGER.debug(
          `Innertube bereit · Player sts ${instance.session.player?.signature_timestamp ?? "?"}`,
        );
        setYoutube(instance);
      })
      .catch(e => LOGGER.warn("Innertube-Erzeugung fehlgeschlagen: ", e));
  }, []);

  return youtube;
}
