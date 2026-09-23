import {useMemo} from "react";
import {Platform, useWindowDimensions} from "react-native";
import {useSafeAreaInsets} from "react-native-safe-area-context";

import {getChromeLayout, type ChromeLayout} from "./appShell";

import {useMusikPlayerContext} from "@/context/MusicPlayerContext";
import {getLayoutClass, type LayoutClass} from "@/ui/theme";

export interface AppChrome extends ChromeLayout {
  layout: LayoutClass;
  insets: ReturnType<typeof useSafeAreaInsets>;
  miniPlayerVisible: boolean;
}

/**
 * Shared app shell state for phone, tablet, and TV. Screens read the header,
 * safe area, navigation, and mini player geometry from here instead of
 * measuring or hard-coding it per surface.
 */
export function useAppChrome(): AppChrome {
  const {width, height} = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const {currentItem} = useMusikPlayerContext();
  const layout = getLayoutClass(width, Platform.isTV);
  const miniPlayerVisible = Boolean(currentItem);

  return useMemo(
    () => ({
      ...getChromeLayout({
        layout,
        insets,
        miniPlayerVisible,
        size: {width, height},
      }),
      layout,
      insets,
      miniPlayerVisible,
    }),
    [height, insets, layout, miniPlayerVisible, width],
  );
}
