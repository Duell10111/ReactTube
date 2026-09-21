import BottomSheet from "@gorhom/bottom-sheet";
import React, {useEffect, useMemo, useRef} from "react";
import {StyleSheet, View} from "react-native";

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
}

const snapPoints = ["60%", "92%"];

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
}: SheetPanelProps) {
  const {theme} = useAppTheme();
  const {t} = useTranslation();
  const sheetRef = useRef<BottomSheet>(null);

  useEffect(() => {
    if (open) {
      sheetRef.current?.snapToIndex(0);
    } else {
      sheetRef.current?.close();
    }
  }, [open]);

  const backgroundStyle = useMemo(
    () => ({backgroundColor: theme.colors.surface}),
    [theme.colors.surface],
  );

  return (
    // A closed sheet still covers the screen, so three of them stacked over a
    // feed would swallow its touches. The wrapper hands them back.
    <View
      pointerEvents={open ? "box-none" : "none"}
      style={StyleSheet.absoluteFill}>
      <BottomSheet
        backgroundStyle={backgroundStyle}
        enablePanDownToClose
        handleIndicatorStyle={{backgroundColor: theme.colors.textSecondary}}
        index={-1}
        onClose={onClose}
        ref={sheetRef}
        snapPoints={snapPoints}>
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
