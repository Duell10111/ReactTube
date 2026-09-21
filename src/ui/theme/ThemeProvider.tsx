import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {AccessibilityInfo, Platform} from "react-native";

import {createAppTheme, type AppTheme} from "./appTheme";

interface ThemeContextValue {
  theme: AppTheme;
  reduceMotion: boolean;
}

const defaultValue: ThemeContextValue = {
  theme: createAppTheme(false),
  reduceMotion: false,
};

const ThemeContext = createContext<ThemeContextValue>(defaultValue);

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({children}: ThemeProviderProps) {
  const [reduceMotion, setReduceMotion] = useState(false);
  const theme = useMemo(() => createAppTheme(Platform.isTV), []);

  useEffect(() => {
    let mounted = true;

    AccessibilityInfo.isReduceMotionEnabled().then(enabled => {
      if (mounted) {
        setReduceMotion(enabled);
      }
    });

    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduceMotion,
    );

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  const value = useMemo(() => ({theme, reduceMotion}), [reduceMotion, theme]);

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useAppTheme() {
  return useContext(ThemeContext);
}
