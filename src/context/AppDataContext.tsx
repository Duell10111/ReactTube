import React, {createContext, useCallback, useContext, useState} from "react";
import {MMKV} from "react-native-mmkv";

// TODO: Use MMKV For this to support Android

const storage = new MMKV({id: "settings"});

const settingsKey = "appSettings";

export interface AppSettings {
  vlcEnabled?: boolean;
  ownOverlayEnabled?: boolean;
  hlsEnabled?: boolean;
  localHlsEnabled?: boolean;
  languageSelected?: string;
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
