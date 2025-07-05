import React, {createContext, useContext} from "react";
import {useColorScheme} from "react-native";

type StyleType = "dark" | "light";

interface AppStyle {
  textColor: string;
  invertedTextColor: string;
  backgroundColor: string;
  backgroundColorAlpha: string;
}

const dark: AppStyle = {
  textColor: "white",
  invertedTextColor: "black",
  backgroundColor: "black",
  backgroundColorAlpha: "#111111cc",
};

const light: AppStyle = {
  textColor: "black",
  invertedTextColor: "white",
  backgroundColor: "white",
  backgroundColorAlpha: "#ddddddcc",
};

interface AppStyleContext {
  type: StyleType;
  style: AppStyle;
}

const Context = createContext<AppStyleContext>({
  style: dark,
  type: "dark",
});

interface Props {
  children?: React.ReactNode;
}

export default function AppStyleProvider({children}: Props) {
  const scheme = useColorScheme();
  const type: StyleType = scheme === "light" ? "light" : "dark";
  const style = type === "dark" ? dark : light;
  const value: AppStyleContext = {
    type,
    style,
  };

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useAppStyle() {
  return useContext(Context);
}
