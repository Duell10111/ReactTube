import BottomSheet from "@gorhom/bottom-sheet";
import React, {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {StyleProp, StyleSheet, View, ViewStyle} from "react-native";

import {useTranslation} from "@/localization";
import {AppIconButton, AppText, Divider} from "@/ui/components";
import {useAppTheme} from "@/ui/theme";

interface SheetPanelProps {
  title: string;
  /** Rendered next to the title, for a count or a position. */
  subtitle?: string;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  testID?: string;
  /**
   * The area the sheet lives in, the whole screen by default. A split layout
   * narrows it to the side column so the sheet never covers the video.
   */
  containerStyle?: StyleProp<ViewStyle>;
  /** One snap point at the full height of the container instead of two. */
  fullHeight?: boolean;
}

const defaultSnapPoints = ["60%", "92%"];
const fullHeightSnapPoints = ["100%"];

/**
 * The one sheet every secondary video surface opens in: description, comments,
 * and queue. It owns the theme, the title row, and the close action, so those
 * three panels cannot look like three different products.
 *
 * Playback keeps running behind the sheet, which is the point of a sheet over
 * a screen for these panels. The sheet is only mounted while it is open or
 * closing: a closed sheet keeps the closed position of the container it was
 * closed in, and when that container grows, as on entering full screen, its
 * top edge shows at the bottom of the screen.
 */
export function SheetPanel({
  title,
  subtitle,
  open,
  onClose,
  children,
  testID,
  containerStyle,
  fullHeight = false,
}: SheetPanelProps) {
  const {theme} = useAppTheme();
  const {t} = useTranslation();
  const [mounted, setMounted] = useState(open);
  if (open && !mounted) {
    setMounted(true);
  }

  const sheetRef = useRef<BottomSheet>(null);

  // The `index` prop only places a sheet on mount: the library ignores a
  // change of it to -1, so closing has to go through the ref.
  useEffect(() => {
    if (open) {
      sheetRef.current?.snapToIndex(0);
    } else {
      sheetRef.current?.close();
    }
  }, [open]);

  const handleClose = useCallback(() => {
    setMounted(false);
    onClose();
  }, [onClose]);

  const backgroundStyle = useMemo(
    () => ({backgroundColor: theme.colors.surface}),
    [theme.colors.surface],
  );

  if (!mounted) {
    return null;
  }

  return (
    // A closing sheet still covers the screen and would swallow touches meant
    // for the feed. The wrapper hands them back.
    <View
      pointerEvents={open ? "box-none" : "none"}
      style={[StyleSheet.absoluteFill, containerStyle]}>
      <BottomSheet
        // A rotation moves the sheet between the bottom and the side column.
        // Adapting the mounted sheet left it positioned for the old container,
        // off its touch area and impossible to close; a fresh one measures the
        // new container and opens at the right place.
        key={fullHeight ? "side" : "bottom"}
        backgroundStyle={backgroundStyle}
        // Otherwise the content height becomes an extra, first snap point
        // and the sheet opens there instead of at the snap points below.
        enableDynamicSizing={false}
        enablePanDownToClose
        handleIndicatorStyle={{backgroundColor: theme.colors.textSecondary}}
        index={open ? 0 : -1}
        onClose={handleClose}
        ref={sheetRef}
        snapPoints={fullHeight ? fullHeightSnapPoints : defaultSnapPoints}>
        <View
          style={[
            styles.header,
            {
              gap: theme.spacing.md,
              paddingHorizontal: theme.spacing.lg,
              paddingBottom: theme.spacing.sm,
            },
          ]}
          testID={testID}>
          <View style={styles.headline}>
            <AppText numberOfLines={1} variant={"titleSmall"}>
              {title}
            </AppText>
            {subtitle ? (
              <AppText color={"textSecondary"} variant={"bodySmall"}>
                {subtitle}
              </AppText>
            ) : null}
          </View>
          <AppIconButton
            accessibilityLabel={t("video.panel.close")}
            icon={"close"}
            onPress={onClose}
          />
        </View>
        <Divider />
        {children}
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
  },
  headline: {
    flex: 1,
  },
});
