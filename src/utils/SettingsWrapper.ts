import {useCallback, useState} from "react";
import {Platform, Settings} from "react-native";
import {MMKV} from "react-native-mmkv";

// TODO: Add concrete Android implementation

const storage = new MMKV({
  id: "settings-storage",
});

function getSettings<T>(settingsKey: string) {
  if (Platform.OS === "android") {
    const value = storage.getString(settingsKey);
    if (value && typeof value === "string") {
      return JSON.parse(value) as T;
    }
    return undefined;
  }

  const value = Settings.get(settingsKey);
  if (value && typeof value === "string") {
    return JSON.parse(value) as T;
  }
  return undefined;
}

function setSettings<T>(settingsKey: string, settings: Partial<T>) {
  const curSettings = getSettings<T>(settingsKey);
  const newValue = {
    ...curSettings,
    ...settings,
  };
  if (Platform.OS === "android") {
    storage.set(settingsKey, JSON.stringify(newValue));
    return;
  }

  Settings.set({
    [settingsKey]: JSON.stringify(newValue),
  });
}

function resetSettings(settingsKey: string) {
  Settings.set({
    [settingsKey]: null,
  });
}

export function useSettings<T>(settingsKey: string, defaultValue: T) {
  const [settings, setSettingState] = useState<T>(
    getSettings<T>(settingsKey) ?? defaultValue,
  );

  const updateSettings = useCallback(
    (data: Partial<T>) => {
      setSettings(settingsKey, data);
      const update = getSettings<T>(settingsKey);
      if (update) {
        setSettingState(update);
      }
    },
    [settingsKey],
  );

  const clearAll = useCallback(() => {
    setSettings<T>(settingsKey, defaultValue);
  }, [settingsKey, defaultValue]);

  return {
    settings,
    updateSettings,
    clearAll,
  };
}
