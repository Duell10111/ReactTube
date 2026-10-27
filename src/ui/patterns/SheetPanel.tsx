import BottomSheet from "@gorhom/bottom-sheet";
import React, {useMemo} from "react";
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
 * The sheet stays mounted and closed. Playback keeps running behind it, which
 * is the point of a sheet over a screen for these panels.
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

  const backgroundStyle = useMemo(
    () => ({backgroundColor: theme.colors.surface}),
    [theme.colors.surface],
  );

  return (
    // A closed sheet still covers the screen, so three of them stacked over a
    // feed would swallow its touches. The wrapper hands them back.
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
        // The sheet follows this prop, so `open` alone opens and closes it.
        index={open ? 0 : -1}
        onClose={onClose}
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
