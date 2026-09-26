import React, {createContext, useCallback, useContext, useState} from "react";
import {createMMKV} from "react-native-mmkv";

import type {UILanguage} from "@/localization/types";

const storage = createMMKV({id: "settings"});

const settingsKey = "appSettings";

export interface AppSettings {
  vlcEnabled?: boolean;
  ownOverlayEnabled?: boolean;
  hlsEnabled?: boolean;
  localHlsEnabled?: boolean;
  /**
   * Offers AV1 in the custom manifest (plan phase 2c).
   *
   * YouTube only supplies avc1 up to 1080p, so AV1 is needed for 1440p/2160p.
   * Hardware decoding starts with Apple TV 4K (3rd generation). On devices
   * without a decoder, playback stalls silently instead of reporting an error.
   * Keep this disabled until the user explicitly enables it.
   */
  av1Enabled?: boolean;
  languageSelected?: string;
  uiLanguage?: UILanguage;
  trackingEnabled?: boolean;
}

interface AppDataContext {
  appSettings: AppSettings;
  updateSettings: (settings: Partial<AppSettings>) => void;
}

// @ts-ignore
const defaultContext: AppDataContext = {
  appSettings: {},
  updateSettings: () => {},
};

const context = createContext<AppDataContext>(defaultContext);

// TODO: Add concrete implementation for Android

function getSettings() {
  // if (Platform.OS === "android") {
  //   return undefined;
  // }

  const value = storage.getString(settingsKey);
  if (value && typeof value === "string") {
    return JSON.parse(value) as AppSettings;
  }
  return undefined;
}

function setSettings(settings: Partial<AppSettings>) {
  // if (Platform.OS === "android") {
  //   return;
  // }

  const curSettings = getSettings();
  const newValue: AppSettings = {
    ...curSettings,
    ...settings,
  };
  storage.set(settingsKey, JSON.stringify(newValue));
}

interface Props {
  children: React.ReactNode;
}

export default function AppDataContextProvider({children}: Props) {
  const [settings, setSettingState] = useState<AppSettings>(
    getSettings() ?? {},
  );

  const updateSettings = useCallback((data: Partial<AppSettings>) => {
    setSettings(data);
    const update = getSettings();
    if (update) {
      setSettingState(update);
    }
  }, []);

  const value: AppDataContext = {
    appSettings: settings,
    updateSettings,
  };

  console.log("App Data rerender!");

  return <context.Provider children={children} value={value} />;
}

export function useAppData() {
  return useContext(context);
}
