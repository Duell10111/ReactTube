import {BottomSheetScrollView} from "@gorhom/bottom-sheet";
import React, {useMemo, useState} from "react";
import {Platform, ScrollView, StyleSheet, View} from "react-native";

import {splitDescriptionBlocks} from "./descriptionBlocks";

import {useTranslation} from "@/localization";
import {AppText} from "@/ui/components";
import {useAppTheme} from "@/ui/theme";

interface VideoDescriptionPanelProps {
  description?: string;
  /** Inside a bottom sheet the view has to be the sheet's own scrollable. */
  inSheet?: boolean;
}

/** The full description, which no surface shows inline any more. */
export function VideoDescriptionPanel({
  description,
  inSheet = false,
}: VideoDescriptionPanelProps) {
  const {theme} = useAppTheme();
  const {t} = useTranslation();
  const Container = inSheet ? BottomSheetScrollView : ScrollView;
  const blocks = useMemo(
    () => (description ? splitDescriptionBlocks(description) : []),
    [description],
  );
  // A remote scrolls by moving focus, so on TV the text is handed out in
  // focusable pieces instead of as one block nothing can focus.
  const stepped = Platform.isTV && !inSheet && blocks.length > 0;

  return (
    <Container
      contentContainerStyle={{
        padding: theme.spacing.lg,
        gap: stepped ? theme.spacing.sm : undefined,
      }}
      style={styles.container}
      testID={"video-description"}>
      {stepped ? (
        blocks.map((block, index) => (
          <DescriptionBlock key={index} text={block} />
        ))
      ) : (
        <AppText
          color={description ? "textPrimary" : "textSecondary"}
          numberOfLines={0}
          variant={"body"}>
          {description ?? t("video.description.empty")}
        </AppText>
      )}
    </Container>
  );
}

interface DescriptionBlockProps {
  text: string;
}

function DescriptionBlock({text}: DescriptionBlockProps) {
  const {theme} = useAppTheme();
  const [focused, setFocused] = useState(false);

  return (
    <View
      accessibilityRole={"text"}
      collapsable={false}
      focusable
      onBlur={() => setFocused(false)}
      onFocus={() => setFocused(true)}
      style={{
        backgroundColor: focused
          ? theme.colors.surfacePressed
          : theme.colors.focusResting,
        borderColor: focused ? theme.colors.focus : theme.colors.focusResting,
        borderRadius: theme.radii.card,
        borderWidth: 3,
        padding: theme.spacing.sm,
      }}>
      <AppText numberOfLines={0} variant={"body"}>
        {text}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
