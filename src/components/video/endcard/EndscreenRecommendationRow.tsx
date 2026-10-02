import React from "react";
import {Platform, ScrollView, StyleSheet, View} from "react-native";

import {EndscreenCard} from "./EndscreenCard";
import {useEndscreenElementPress} from "./useEndscreenElementPress";

import type {YTEndscreenElement} from "@/extraction/Types";
import {useTranslation} from "@/localization";
import {AppText} from "@/ui/components";
import type {FeedMetrics, FeedRowPadding} from "@/ui/patterns";
import {useAppTheme} from "@/ui/theme";
import {TVFocusRegion} from "@/ui/tv";

/** A channel avatar next to 16:9 cards reads best at about half their width. */
const CHANNEL_WIDTH_RATIO = 0.56;

interface EndscreenRecommendationRowProps {
  elements: YTEndscreenElement[];
  metrics: FeedMetrics;
  padding: FeedRowPadding;
}

/**
 * The creator's end cards once the video is over. They were the creator's own
 * pick for what to watch next, so they keep a row of their own above the
 * generic related videos instead of disappearing with the video.
 */
export function EndscreenRecommendationRow({
  elements,
  metrics,
  padding,
}: EndscreenRecommendationRowProps) {
  const {theme} = useAppTheme();
  const {t} = useTranslation();
  const openElement = useEndscreenElementPress();

  return (
    <View style={[styles.container, {gap: theme.spacing.sm}]}>
      <View style={padding}>
        <AppText accessibilityRole={"header"} variant={"titleMedium"}>
          {t("video.endscreen.fromCreator")}
        </AppText>
      </View>
      <TVFocusRegion>
        <ScrollView
          contentContainerStyle={[
            styles.content,
            {gap: metrics.gap, paddingVertical: theme.spacing.md},
            padding,
          ]}
          horizontal
          showsHorizontalScrollIndicator={!Platform.isTV}>
          {elements.map(element => (
            <EndscreenCard
              element={element}
              interactive
              key={element.id}
              onPress={openElement}
              style={{
                width:
                  element.style === "CHANNEL"
                    ? Math.round(metrics.shelfCardWidth * CHANNEL_WIDTH_RATIO)
                    : metrics.shelfCardWidth,
              }}
              variant={"row"}
            />
          ))}
        </ScrollView>
      </TVFocusRegion>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  content: {
    alignItems: "flex-start",
  },
});
