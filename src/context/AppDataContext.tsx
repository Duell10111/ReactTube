import React, {createContext, useCallback, useContext, useState} from "react";
import {Settings} from "react-native";

const settingsKey = "appSettings";

interface AppSettings {
  vlcEnabled?: boolean;
}

interface AppDataContext {
  appSettings: AppSettings;
  updateSettings: (settings: Partial<AppSettings>) => void;
}

const defaultContext: AppDataContext = {
  appSettings: {},
  updateSettings: () => {},
};

const context = createContext<AppDataContext>(defaultContext);

function getSettings() {
  const value = Settings.get(settingsKey);
  if (value && typeof value === "string") {
    return JSON.parse(value) as AppSettings;
  }
  return undefined;
}

function setSettings(settings: Partial<AppSettings>) {
  const curSettings = getSettings();
  const newValue: AppSettings = {
    ...curSettings,
    ...settings,
  };
  Settings.set({
    [settingsKey]: JSON.stringify(newValue),
  });
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
    updateSettings: updateSettings,
  };

  return <context.Provider children={children} value={value} />;
}

export function useAppData() {
  return useContext(context);
}
