import {Icon} from "@rneui/base";
import React from "react";
import {StyleSheet, Text, View} from "react-native";

import ChannelIcon from "@/components/video/ChannelIcon";
import {useAppStyle} from "@/context/AppStyleContext";
import {YTVideoInfo as YTVideoInfoType} from "@/extraction/Types";

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
      </View>
      <View style={styles.likeContainer}>
        <Icon
          name={"like2"}
          type={"antdesign"}
          color={actionData?.liked ? "blue" : undefined}
          raised
          reverse
          size={15}
          onPress={() => (actionData?.liked ? removeRating() : like())}
        />
        <Icon
          name={"dislike2"}
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
  likeContainer: {
    flexDirection: "row",
  },
});
