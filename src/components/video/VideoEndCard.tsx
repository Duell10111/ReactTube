import React, {useMemo} from "react";
import {DimensionValue, Platform, StyleSheet, View} from "react-native";
import Animated, {FadeIn, FadeOut} from "react-native-reanimated";

import {EndscreenCard} from "@/components/video/endcard/EndscreenCard";
import {getActiveEndscreenElements} from "@/components/video/endcard/endscreenModel";
import {useEndscreenElementPress} from "@/components/video/endcard/useEndscreenElementPress";
import {YTEndscreen, YTEndscreenElement} from "@/extraction/Types";
import {useAppTheme} from "@/ui/theme";

const surface = {canOpenWebsites: !Platform.isTV};

export interface VideoEndCardProps {
  endcard: YTEndscreen;
  currentTime: number;
  /** Show every card at once, for an end screen opened before its time. */
  ignoreTiming: boolean;
  /** Whether the cards own the remote. Otherwise they are only pictures. */
  browsing: boolean;
  /** Lets the player leave browse mode once a card has been opened. */
  onElementOpened: () => void;
}

/**
 * The creator's end cards on top of the playing video, each at the position
 * and time YouTube gives it. Creators design the last seconds of a video
 * around these cards, so the layer adds no scrim of its own.
 */
export default function VideoEndCard({
  endcard,
  currentTime,
  ignoreTiming,
  browsing,
  onElementOpened,
}: VideoEndCardProps) {
  const {theme} = useAppTheme();
  const openElement = useEndscreenElementPress();

  const elements = useMemo(
    () =>
      getActiveEndscreenElements(
        endcard.elements,
        currentTime,
        surface,
        ignoreTiming,
      ),
    [currentTime, endcard.elements, ignoreTiming],
  );

  const onPress = (element: YTEndscreenElement) => {
    onElementOpened();
    openElement(element);
  };

  return (
    <View pointerEvents={"box-none"} style={StyleSheet.absoluteFill}>
      {elements.map((element, index) => (
        <Animated.View
          entering={FadeIn.duration(theme.motion.duration.deliberate)}
          exiting={FadeOut.duration(theme.motion.duration.standard)}
          key={element.id}
          style={[
            styles.element,
            {
              width: numberToPercent(element.width),
              top: numberToPercent(element.top),
              left: numberToPercent(element.left),
            },
          ]}>
          <EndscreenCard
            element={element}
            hasTVPreferredFocus={browsing && index === 0}
            interactive={browsing}
            onPress={onPress}
            variant={"overlay"}
          />
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  element: {
    position: "absolute",
  },
});

function numberToPercent(number: number) {
  return `${number * 100}%` as DimensionValue;
}
