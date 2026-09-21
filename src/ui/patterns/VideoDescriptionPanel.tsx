import {BottomSheetScrollView} from "@gorhom/bottom-sheet";
import React from "react";
import {ScrollView} from "react-native";

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

  return (
    <Container
      contentContainerStyle={{padding: theme.spacing.lg}}
      testID={"video-description"}>
      <AppText
        color={description ? "textPrimary" : "textSecondary"}
        numberOfLines={0}
        variant={"body"}>
        {description ?? t("video.description.empty")}
      </AppText>
    </Container>
  );
}
