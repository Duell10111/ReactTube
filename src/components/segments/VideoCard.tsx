import {DeviceType, deviceType} from "expo-device";
import React from "react";
import {Platform, StyleProp, TextStyle, ViewStyle} from "react-native";

import ReelCardPhone from "./phone/ReelCardPhone";
import VideoCardPhone from "./phone/VideoCardPhone";
import VideoCardTV from "./tv/VideoCardTV";
import Logger from "../../utils/Logger";

import {VideoData} from "@/extraction/Types";
import useElementPressableHelper from "@/hooks/utils/useElementPressableHelper";

const LOGGER = Logger.extend("VIDEOCARD");

interface Props {
  textStyle?: StyleProp<TextStyle>;
  style?: StyleProp<ViewStyle>;
  data: VideoData;
  disabled?: boolean;
  onPress?: () => void;
}

// OLD WAY: Should be replaced with VideoCard in elements/tv
export default function VideoCard({style, data, disabled}: Props) {
  const {onPress: onPressWrapper} = useElementPressableHelper();

  const onPress = () => {
    if (disabled) {
      return;
    }

    onPressWrapper(data);
  };

  if (Platform.isTV) {
    return <VideoCardTV data={data} onPress={onPress} />;
  }

  if (data.type === "reel") {
    return <ReelCardPhone data={data} onPress={onPress} />;
  }

  return (
    <VideoCardPhone
      data={data}
      onPress={onPress}
      style={[
        style,
        deviceType === DeviceType.TABLET
          ? {maxWidth: 375, padding: 10}
          : undefined,
      ]}
      imageContainerStyle={
        deviceType === DeviceType.TABLET ? {borderRadius: 25} : undefined
      }
    />
  );
}
