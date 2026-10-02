import {useNavigation} from "@react-navigation/native";
import React, {useMemo} from "react";
import {Modal, Platform, ScrollView, StyleSheet, View} from "react-native";

import ChannelIcon from "./ChannelIcon";
import {EndscreenRecommendationRow} from "./endcard/EndscreenRecommendationRow";
import {UpNextHero} from "./endcard/UpNextHero";
import {
  getEndscreenRecommendations,
  resolveNextVideo,
} from "./endcard/endscreenModel";
import useVideoElementData from "../../hooks/video/useVideoElementData";

import {RelatedVideos} from "@/components/video/tv/RelatedVideos";
import {YTVideoInfo} from "@/extraction/Types";
import {NativeStackProp} from "@/navigation/types";
import {AppText} from "@/ui/components";
import {
  getFeedRowPadding,
  getVideoDetailMetadata,
  useFeedGeometry,
} from "@/ui/patterns";
import {useAppTheme} from "@/ui/theme";
import {TVFocusRegion, useTVOverscanInsets} from "@/ui/tv";

interface Props {
  video: YTVideoInfo;
  visible: boolean;
  onCloseRequest: () => void;
  /** Set when playback reached the end; only then is there an up-next hero. */
  endCard?: boolean;
  currentResolution?: string;
}

const metadataSeparator = " · ";
const surface = {canOpenWebsites: !Platform.isTV};

/**
 * End screen of the TV player. After a video it leads with what plays next,
 * then the creator's own end cards, then the related videos — one surface
 * with one scrim. Opened on demand during playback it shows the current
 * video instead of the up-next hero.
 */
export default function EndCard({
  visible,
  onCloseRequest,
  video,
  endCard,
  currentResolution,
}: Props) {
  const navigation = useNavigation<NativeStackProp>();
  const {theme} = useAppTheme();
  const overscan = useTVOverscanInsets();
  const {metrics, contentPadding} = useFeedGeometry();

  const padding = useMemo(
    () => getFeedRowPadding(contentPadding, theme.spacing.sm),
    [contentPadding, theme.spacing.sm],
  );

  const next = useMemo(() => resolveNextVideo(video), [video]);
  // Only an ended video needs its successor; the on-demand view does not.
  const {videoElement: nextVideo} = useVideoElementData(
    endCard ? (next.navEndpoint ?? next.videoId) : undefined,
  );

  const recommendations = useMemo(
    () => getEndscreenRecommendations(video.endscreen?.elements, surface),
    [video.endscreen?.elements],
  );

  const metadataLine = useMemo(
    () =>
      [...getVideoDetailMetadata(video), currentResolution]
        .filter(Boolean)
        .join(metadataSeparator),
    [currentResolution, video],
  );

  if (!video.originalData.watch_next_feed) {
    // TODO: Add warning or debug message
    return null;
  }

  const showUpNext = endCard && next.videoId !== undefined;

  return (
    <Modal
      animationType={"fade"}
      onRequestClose={() => onCloseRequest()}
      transparent
      visible={visible}>
      <View style={styles.root}>
        {/*
         * Nearly opaque: the frozen last frame behind it is often text or a
         * busy end slate, and at the lighter scrim it showed through the
         * titles. A hint of it stays, so the screen still reads as the
         * video's end rather than a new page.
         */}
        <View
          style={[
            StyleSheet.absoluteFill,
            styles.backdrop,
            {backgroundColor: theme.colors.background},
          ]}
        />
        <ScrollView
          contentContainerStyle={[
            styles.content,
            {
              gap: theme.spacing.xxl,
              paddingTop: overscan.top + theme.spacing.xl,
              paddingBottom: overscan.bottom,
            },
          ]}>
          {/* Its own region, so coming back up from a row returns to the
           * hero control that was left, like the rows below it do. */}
          <TVFocusRegion style={padding}>
            {showUpNext ? (
              <UpNextHero
                // A new successor is a new countdown.
                key={next.videoId}
                nextVideo={nextVideo}
                onClose={onCloseRequest}
                onPlay={target => {
                  // @ts-ignore TODO: fix
                  navigation.replace("VideoScreen", {
                    videoId: target.id,
                    navEndpoint: next.navEndpoint,
                  });
                }}
              />
            ) : (
              <View style={[styles.currentVideo, {gap: theme.spacing.md}]}>
                <ChannelIcon channelId={video.channel_id ?? ""} />
                <View style={styles.currentVideoText}>
                  <AppText numberOfLines={1} variant={"labelSmall"}>
                    {video.channel?.name ?? ""}
                  </AppText>
                  <AppText numberOfLines={2} variant={"titleSmall"}>
                    {video.title}
                  </AppText>
                  {metadataLine ? (
                    <AppText color={"textSecondary"} variant={"bodySmall"}>
                      {metadataLine}
                    </AppText>
                  ) : null}
                </View>
              </View>
            )}
          </TVFocusRegion>
          {recommendations.length > 0 ? (
            <EndscreenRecommendationRow
              elements={recommendations}
              metrics={metrics}
              padding={padding}
            />
          ) : null}
          <RelatedVideos YTVideoInfo={video} playlistShown={false} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  backdrop: {
    opacity: 0.94,
  },
  content: {
    flexGrow: 1,
    justifyContent: "flex-end",
  },
  currentVideo: {
    flexDirection: "row",
    alignItems: "center",
  },
  currentVideoText: {
    flex: 1,
  },
});
