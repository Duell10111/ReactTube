import {useFocusEffect, useIsFocused} from "@react-navigation/native";
import {NativeStackScreenProps} from "@react-navigation/native-stack";
import React, {useCallback, useEffect, useState} from "react";
import {Platform, StyleSheet, TVEventControl, View} from "react-native";

import {
  type ShortEntrance,
  type ShortFocusSlot,
  TVShortItem,
} from "@/components/shorts/tv/TVShortItem";
import {
  interpretShortsRemoteEvent,
  shouldPrefetchShorts,
  stepShortIndex,
} from "@/components/shorts/tv/shortsQueueModel";
import {useShortsQueue} from "@/hooks/video/useShortsQueue";
import {RootStackParamList} from "@/navigation/RootStackNavigator";
import {useTVRemoteEvent} from "@/ui/tv";

type Props = NativeStackScreenProps<RootStackParamList, "VideoScreen">;

const remotePlatform = Platform.OS === "android" ? "android" : "ios";

/**
 * Full-screen shorts player for TV. Up and down on the remote move through
 * YouTube's shorts sequence, select on the video pauses it, and the actions
 * beside it stay reachable with left and right.
 */
export default function ShortsScreen({route}: Props) {
  const {videoId} = route.params;
  const {videoIds, hasMore, fetchMore} = useShortsQueue(videoId);
  const isFocused = useIsFocused();

  const [index, setIndex] = useState(0);
  const [entrance, setEntrance] = useState<ShortEntrance>(0);
  const [paused, setPaused] = useState(false);
  const [focusSlot, setFocusSlot] = useState<ShortFocusSlot>("video");

  useEffect(() => {
    if (shouldPrefetchShorts(index, videoIds.length)) {
      fetchMore();
    }
  }, [fetchMore, index, videoIds.length]);

  const step = useCallback(
    (intent: "next" | "previous") => {
      const next = stepShortIndex(index, intent, videoIds.length);
      if (next === index) {
        return;
      }
      setEntrance(intent === "next" ? 1 : -1);
      setPaused(false);
      setIndex(next);
    },
    [index, videoIds.length],
  );

  // Only while this screen is on top: the comments panel is a modal above it
  // and needs up and down for its own list.
  useTVRemoteEvent(event => {
    const intent = interpretShortsRemoteEvent(event, remotePlatform);
    if (intent === "togglePlay") {
      setPaused(previous => !previous);
    } else if (intent) {
      step(intent);
    }
  }, isFocused);

  useFocusEffect(
    useCallback(() => {
      // The menu key has to leave the player even while a short is loading.
      TVEventControl.enableTVMenuKey();
    }, []),
  );

  const currentId = videoIds[index] ?? videoId;

  return (
    <View style={styles.root}>
      <TVShortItem
        key={currentId}
        entrance={entrance}
        focusSlot={focusSlot}
        hasNext={index < videoIds.length - 1 || hasMore}
        hasPrevious={index > 0}
        onFocusSlot={setFocusSlot}
        onTogglePause={() => setPaused(previous => !previous)}
        paused={paused}
        videoId={currentId}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "black",
  },
});
