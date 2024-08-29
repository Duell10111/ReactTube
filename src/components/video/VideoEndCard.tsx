import {useNavigation} from "@react-navigation/native";
import React from "react";
import {
  DeviceEventEmitter,
  DimensionValue,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import FastImage from "react-native-fast-image";

import {EndCardCloseEvent} from "@/components/video/videoPlayer/VideoPlayer";
import {YTEndscreen, YTEndscreenElement} from "@/extraction/Types";
import {RootNavProp} from "@/navigation/RootStackNavigator";
import Logger from "@/utils/Logger";

const LOGGER = Logger.extend("VIDEO_ENDCARD");

interface VideoEndCardProps {
  endcard: YTEndscreen;
}

export default function VideoEndCard({endcard}: VideoEndCardProps) {
  return (
    <View
      style={[
        {
          backgroundColor: "rgba(119,119,119,0.6)",
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        },
        // containerStyle,
      ]}>
      {endcard.elements.map(e => (
        <VideoCard key={e.id} element={e} />
      ))}
    </View>
  );
}

interface VideoCardProps {
  element: YTEndscreenElement;
}

function VideoCard({element}: VideoCardProps) {
  //TODO: Difference between channel and web?

  const navigation = useNavigation<RootNavProp>();

  return (
    <TouchableOpacity
      style={{
        position: "absolute",
        width: numberToPercent(element.width),
        top: numberToPercent(element.top),
        left: numberToPercent(element.left),
        aspectRatio: element.aspect_ratio,
      }}
      onPress={() => {
        console.log("Style: ", element.style);
        console.log("EndCard NAvEndpoint: ", element.navEndpoint);
        console.log("EndCard ID: ", element.id);
        if (element.style === "CHANNEL") {
          const channelID = element.navEndpoint.payload.browseId;
          navigation.navigate("ChannelScreen", {
            channelId: channelID,
          });
        } else if (element.style === "VIDEO") {
          navigation.navigate("VideoScreen", {
            navEndpoint: element.navEndpoint,
            videoId: "", // TODO: Wrong id as not known :/
          });
        } else if (element.style === "WEBSITE") {
          const websiteUrl = element.navEndpoint.payload.url;
          LOGGER.debug("Website triggered!");
          // Only on phone?!
        } else {
          LOGGER.warn(`Unknown EndCard type ${element.style}`);
        }
        // Emit Event to trigger Close of EndCard
        DeviceEventEmitter.emit(EndCardCloseEvent);
      }}>
      <FastImage
        style={[styles.image]}
        source={
          element.thumbnailImage
            ? {uri: element.thumbnailImage.url}
            : require("../../../assets/grey-background.jpg")
        }
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {},
  image: {
    flex: 1,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: "black",
  },
});

function numberToPercent(number: number) {
  return `${number * 100}%` as DimensionValue;
}
