import {Icon} from "@rneui/base";
import React, {useState} from "react";
import {StyleSheet, Text, View} from "react-native";

import ChannelIcon from "@/components/video/ChannelIcon";
import {PlayerActionButton} from "@/components/video/phone/PlayerActionButton";
import {SubscribeButton} from "@/components/video/phone/SubscribeButton";
import {useAppStyle} from "@/context/AppStyleContext";
import {usePlaylistManagerContext} from "@/context/PlaylistManagerContext";
import {YTVideoInfo as YTVideoInfoType} from "@/extraction/Types";
import useChannelManager from "@/hooks/channel/useChannelManager";

interface VideoMetadataContainerProps {
  YTVideoInfo: YTVideoInfoType;
  actionData: YTVideoInfoType;
  like: () => void;
  dislike: () => void;
  removeRating: () => void;
}

export function VideoMetadataContainer({
  YTVideoInfo,
  actionData,
  like,
  dislike,
  removeRating,
}: VideoMetadataContainerProps) {
  const {style} = useAppStyle();
  const [subscribe, setSubscribe] = useState<boolean>(
    YTVideoInfo.subscribed ?? false,
  );
  const {subscribe: subscribeChannel, unsubscribe} = useChannelManager();
  const {save} = usePlaylistManagerContext();

  return (
    <View style={styles.container}>
      <Text style={[styles.titleStyle, {color: style.textColor}]}>
        {YTVideoInfo.title}
      </Text>
      <View style={styles.subtitleContainer}>
        <Text style={[styles.subtitleStyle, {color: style.textColor}]}>
          {YTVideoInfo.short_views}
        </Text>
        <Text
          style={[
            styles.subtitleStyle,
            styles.subtitleDate,
            {color: style.textColor},
          ]}>
          {YTVideoInfo.publishDate}
        </Text>
      </View>
      <View style={styles.channelContainer}>
        <ChannelIcon
          channelId={YTVideoInfo.channel_id!}
          imageStyle={styles.channelStyle}
        />
        <Text style={[styles.channelTextStyle, {color: style.textColor}]}>
          {YTVideoInfo.channel?.name ?? YTVideoInfo.author?.name}
        </Text>
        <View style={styles.rightChannelContainer}>
          <SubscribeButton
            onPress={() => {
              if (YTVideoInfo.channel_id) {
                if (subscribe) {
                  unsubscribe(YTVideoInfo.channel_id)
                    ?.then(() => setSubscribe(false))
                    .catch(console.warn);
                } else {
                  subscribeChannel(YTVideoInfo.channel_id)
                    ?.then(() => setSubscribe(true))
                    .catch(console.warn);
                }
                setSubscribe(!subscribe);
              } else {
                console.warn(
                  "No channel id provided for Subscription Button to function",
                );
              }
            }}
            subscribed={subscribe}
          />
        </View>
      </View>
      <View style={styles.likeContainer}>
        <Icon
          name={"like"}
          type={"antdesign"}
          color={actionData?.liked ? "blue" : undefined}
          raised
          reverse
          size={15}
          onPress={() => (actionData?.liked ? removeRating() : like())}
        />
        <Icon
          name={"dislike"}
          type={"antdesign"}
          color={actionData?.disliked ? "blue" : undefined}
          raised
          reverse
          size={15}
          onPress={() => (actionData?.disliked ? removeRating() : dislike())}
        />
        {/*<Icon*/}
        {/*  name={"download"}*/}
        {/*  type={"antdesign"}*/}
        {/*  // color={actionData?.disliked ? "blue" : undefined}*/}
        {/*  raised*/}
        {/*  reverse*/}
        {/*  size={15}*/}
        {/*  onPress={() => download(actionData.id)}*/}
        {/*/>*/}
        <PlayerActionButton
          title={"Save"}
          color={"white"}
          iconType={"material"}
          iconName={"playlist-add"}
          onPress={() => {
            save([YTVideoInfo.id]);
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 10,
    paddingTop: 10,
    backgroundColor: "#111111",
  },
  titleStyle: {
    fontSize: 15,
  },
  subtitleContainer: {
    flexDirection: "row",
  },
  subtitleStyle: {
    fontSize: 13,
    marginTop: 5,
  },
  subtitleDate: {
    marginStart: 5,
  },
  channelContainer: {
    flexDirection: "row",
    marginTop: 5,
    alignItems: "center",
  },
  channelStyle: {
    width: 40,
    height: 40,
  },
  channelTextStyle: {
    marginStart: 5,
  },
  rightChannelContainer: {
    flex: 1,
    alignItems: "flex-end",
  },
  likeContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
});
