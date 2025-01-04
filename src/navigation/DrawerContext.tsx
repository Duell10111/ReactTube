import React, {createContext, useContext} from "react";

interface ContextState {
  onScreenFocused?: () => void;
  setHideDrawer?: (hide: boolean) => void;
}

const defState: ContextState = {
  onScreenFocused: () => console.warn("No Provider defined!"),
};

const context = createContext<ContextState>(defState);

interface Props {
  children: React.ReactNode;
  onScreenFocused?: () => void;
  setHideDrawer?: (hide: boolean) => void;
}

export default function DrawerContextProvider({
  children,
  onScreenFocused,
  setHideDrawer,
}: Props) {
  return (
    <context.Provider
      value={{onScreenFocused, setHideDrawer}}
      children={children}
    />
  );
}

export function useDrawerContext() {
  return useContext(context);
}
