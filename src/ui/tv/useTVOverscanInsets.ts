import {useMemo} from "react";
import {Platform, useWindowDimensions} from "react-native";

import {
  getTVOverscanInsets,
  zeroOverscanInsets,
  type TVOverscanInsets,
} from "@/ui/layout/tvOverscan";

/**
 * The title-safe margin of the current screen, and zero on every other
 * surface. Full-screen TV overlays read it directly instead of going through
 * the app shell, because they are drawn outside the content plane the shell
 * describes.
 */
export function useTVOverscanInsets(): TVOverscanInsets {
  const {width, height} = useWindowDimensions();

  return useMemo(
    () =>
      Platform.isTV ? getTVOverscanInsets({width, height}) : zeroOverscanInsets,
    [height, width],
  );
}
