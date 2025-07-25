import {useNavigation} from "@react-navigation/native";
import React, {useMemo} from "react";
import {Modal, ScrollView, StyleSheet, Text, View} from "react-native";

import ChannelIcon from "./ChannelIcon";
import NextVideo from "./endcard/NextVideo";
import useVideoElementData from "../../hooks/video/useVideoElementData";

import {RelatedVideos} from "@/components/video/tv/RelatedVideos";
import {YTVideoInfo} from "@/extraction/Types";
import {NativeStackProp} from "@/navigation/types";

interface Props {
  video: YTVideoInfo;
  visible: boolean;
  onCloseRequest: () => void;
  endCard?: boolean;
  currentResolution?: string;
}

// TODO: Add autoplay for next video

export default function EndCard({
  visible,
  onCloseRequest,
  video,
  endCard,
  currentResolution,
}: Props) {
  const navigation = useNavigation<NativeStackProp>();

  // TODO: use playlist data if available?
  const nextVideoID = useMemo(() => {
    const videoEndpoint = video.originalData.autoplay_video_endpoint;

    return (
      video.playlist?.content?.[video.playlist?.current_index + 1]?.id ??
      videoEndpoint
    );
  }, [video]);

  const {videoElement} = useVideoElementData(nextVideoID ?? undefined);

  if (!video.originalData.watch_next_feed) {
    // TODO: Add warning or debug message
    return null;
  }

  return (
    <Modal
      visible={visible}
      onRequestClose={() => onCloseRequest()}
      transparent>
      <View style={styles.touchContainer}>
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
        <View style={styles.videoInfoContainer}>
          <View style={styles.channelContainer}>
            <ChannelIcon channelId={video.channel_id ?? ""} />
            <Text style={[styles.text, styles.channelText]}>
              {video.channel?.name ?? ""}
            </Text>
          </View>
          <View style={styles.videoContainer}>
            <Text style={[styles.text, styles.videoTitle]}>{video.title}</Text>
            <Text style={[styles.text, styles.viewsText]}>
              {`${video.short_views}`}
            </Text>
            {video.publishDate ? (
              <Text style={[styles.text, styles.viewsText]}>
                {`${video.publishDate}`}
              </Text>
            ) : null}
            {currentResolution ? (
              <Text style={[styles.text, styles.viewsText]}>
                {`Current Resolution ${currentResolution}`}
              </Text>
            ) : null}
          </View>
        </View>
        <View style={styles.bottomContainer}>
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
    backgroundColor: "#11111199",
    flex: 1,
    justifyContent: "flex-end",
  },
  videoInfoContainer: {
    backgroundColor: "#111111cc",
    paddingStart: 20,
    flexDirection: "row",
  },
  channelContainer: {
    alignItems: "center",
  },
  channelText: {
    fontSize: 17,
  },
  videoContainer: {
    marginStart: 10,
    justifyContent: "center",
  },
  videoTitle: {
    fontSize: 25,
  },
  viewsText: {
    alignSelf: "flex-start",
  },
  text: {
    color: "white",
  },
  nextVideoContainer: {
    flex: 1,
  },
  bottomContainer: {
    width: "100%",
    minHeight: "40%",
    maxHeight: "50%",
    backgroundColor: "#111111cc",
    justifyContent: "center",
    paddingTop: 20,
  },
  bottomText: {
    fontSize: 20,
    paddingStart: 20,
    color: "white",
    paddingBottom: 15,
  },
  bottomPlaylistTextContainer: {
    flexDirection: "row",
    paddingStart: 20,
    paddingBottom: 15,
  },
  bottomPlaylistText: {
    fontSize: 20,
    color: "white",
    paddingStart: 10,
  },
});
