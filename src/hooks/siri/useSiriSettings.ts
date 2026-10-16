import {useCallback} from "react";
import {Platform} from "react-native";

import SiriMedia from "../../../modules/siri-media";

import {useAppData} from "@/context/AppDataContext";
import {useTranslation} from "@/localization";
import Logger from "@/utils/Logger";
import {showMessage} from "@/utils/ShowFlashMessageHelper";

const LOGGER = Logger.extend("SIRI");

/** Siri needs the native module, which only the iPhone/iPad build ships. */
export const siriSupported = Platform.OS === "ios" && !Platform.isTV;

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
    (enabled: boolean) => updateSettings({siriDonationsEnabled: enabled}),
    [updateSettings],
  );

  return {
    playbackEnabled: !!appSettings.siriPlaybackEnabled,
    donationsEnabled: !!appSettings.siriDonationsEnabled,
    setPlaybackEnabled,
    setDonationsEnabled,
  };
}
