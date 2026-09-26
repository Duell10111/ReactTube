import {useNavigation} from "@react-navigation/native";
import React, {useMemo} from "react";
import {Modal, ScrollView, StyleSheet, View} from "react-native";

import ChannelIcon from "./ChannelIcon";
import NextVideo from "./endcard/NextVideo";
import useVideoElementData from "../../hooks/video/useVideoElementData";

import {RelatedVideos} from "@/components/video/tv/RelatedVideos";
import {YTVideoInfo} from "@/extraction/Types";
import {NativeStackProp} from "@/navigation/types";
import {AppText} from "@/ui/components";
import {getVideoDetailMetadata} from "@/ui/patterns";
import {useAppTheme} from "@/ui/theme";

interface Props {
  video: YTVideoInfo;
  visible: boolean;
  onCloseRequest: () => void;
  endCard?: boolean;
  currentResolution?: string;
}

const metadataSeparator = " · ";

// TODO: Add autoplay for next video

/**
 * End screen of the TV player. It reuses the metadata parts of the detail view
 * model, so the line under the title reads the same here, in the player
 * overlay, and on a card.
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

  // TODO: use playlist data if available?
  const nextVideoID = useMemo(() => {
    const videoEndpoint = video.originalData.autoplay_video_endpoint;

    return (
      video.playlist?.content?.[video.playlist?.current_index + 1]?.id ??
      videoEndpoint
    );
  }, [video]);

  const {videoElement} = useVideoElementData(nextVideoID ?? undefined);

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

  return (
    <Modal
      onRequestClose={() => onCloseRequest()}
      transparent
      visible={visible}>
      <View
        style={[styles.touchContainer, {backgroundColor: theme.colors.scrim}]}>
        <View style={styles.nextVideoContainer}>
          {endCard ? (
            <NextVideo
              nextVideo={videoElement}
              onPress={videoId => {
                // @ts-ignore TODO: fix
                navigation.replace("VideoScreen", {
                  videoId,
                  navEndpoint: video.originalData.autoplay_video_endpoint,
                });
              }}
            />
          ) : null}
        </View>
        <View
          style={[
            styles.videoInfoContainer,
            {
              backgroundColor: theme.colors.scrim,
              paddingStart: theme.spacing.xl,
              gap: theme.spacing.md,
            },
          ]}>
          <View style={styles.channelContainer}>
            <ChannelIcon channelId={video.channel_id ?? ""} />
            <AppText numberOfLines={1} variant={"labelSmall"}>
              {video.channel?.name ?? ""}
            </AppText>
          </View>
          <View style={styles.videoContainer}>
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
        <View
          style={[
            styles.bottomContainer,
            {
              backgroundColor: theme.colors.scrim,
              paddingTop: theme.spacing.xl,
            },
          ]}>
          <ScrollView>
            <RelatedVideos YTVideoInfo={video} playlistShown={false} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  touchContainer: {
    flex: 1,
    justifyContent: "flex-end",
  },
  videoInfoContainer: {
    flexDirection: "row",
  },
  channelContainer: {
    alignItems: "center",
  },
  videoContainer: {
    flex: 1,
    justifyContent: "center",
  },
  nextVideoContainer: {
    flex: 1,
  },
  bottomContainer: {
    width: "100%",
    minHeight: "40%",
    maxHeight: "50%",
    justifyContent: "center",
  },
});
