import {useCallback} from "react";

import SiriMedia from "../../../modules/siri-media";

import {useAppData} from "@/context/AppDataContext";
import {useTranslation} from "@/localization";
import Logger from "@/utils/Logger";
import {showMessage} from "@/utils/ShowFlashMessageHelper";

const LOGGER = Logger.extend("SIRI");

/** Availability comes from the native build, independently of saved settings. */
export const siriSupported = SiriMedia !== null;

export default function useSiriSettings() {
  const {appSettings, updateSettings} = useAppData();
  const {t} = useTranslation();

  const setPlaybackEnabled = useCallback(
    async (enabled: boolean) => {
      if (!enabled || !SiriMedia) {
        updateSettings({siriPlaybackEnabled: false});
        return;
      }
      // Ask for Siri access the first time it is switched on.
      const status =
        SiriMedia.getSiriAuthorizationStatus() === "notDetermined"
          ? await SiriMedia.requestSiriAuthorization()
          : SiriMedia.getSiriAuthorizationStatus();
      if (status === "authorized") {
        updateSettings({siriPlaybackEnabled: true});
        return;
      }
      LOGGER.info(`Siri authorization ${status}`);
      updateSettings({siriPlaybackEnabled: false});
      showMessage({message: t("settings.siri.denied"), type: "warning"});
    },
    [t, updateSettings],
  );

  const setDonationsEnabled = useCallback(
    (enabled: boolean) =>
      updateSettings({siriDonationsEnabled: siriSupported && enabled}),
    [updateSettings],
  );

  return {
    playbackEnabled: siriSupported && !!appSettings.siriPlaybackEnabled,
    donationsEnabled: siriSupported && !!appSettings.siriDonationsEnabled,
    setPlaybackEnabled,
    setDonationsEnabled,
  };
}
