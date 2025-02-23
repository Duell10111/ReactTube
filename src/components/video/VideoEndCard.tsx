import {useNavigation} from "@react-navigation/native";
import {Image} from "expo-image";
import * as Linking from "expo-linking";
import React from "react";
import {
  DeviceEventEmitter,
  DimensionValue,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {Icon} from "react-native-paper";

import {
  EndCardCloseEvent,
  PausePlayerEvent,
} from "@/components/video/videoPlayer/VideoPlayer";
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
        if (element.style === "CHANNEL") {
          const channelID = element.navEndpoint.payload.browseId;
          navigation.navigate("ChannelScreen", {
            channelId: channelID,
          });
          // Pause player on press of item
          DeviceEventEmitter.emit(PausePlayerEvent);
        } else if (element.style === "VIDEO") {
          navigation.navigate("VideoScreen", {
            navEndpoint: element.navEndpoint,
            videoId: element.navEndpoint?.payload?.videoId,
          });
        } else if (element.style === "PLAYLIST") {
          if (element.navEndpoint?.payload?.videoId) {
            navigation.navigate("VideoScreen", {
              navEndpoint: element.navEndpoint,
              videoId: element.navEndpoint.payload.videoId,
            });
          } else if (element.navEndpoint?.payload?.playlistId) {
            navigation.navigate("PlaylistScreen", {
              playlistId: element.navEndpoint.payload.playlistId,
            });
          }
        } else if (element.style === "WEBSITE") {
          const websiteUrl = element.navEndpoint.payload.url;
          LOGGER.debug("Website triggered!");
          // Only on phone?!
          Linking.openURL(websiteUrl).catch(LOGGER.warn);
        } else {
          LOGGER.warn(`Unknown EndCard type ${element.style}`);
        }
        // Emit Event to trigger Close of EndCard
        DeviceEventEmitter.emit(EndCardCloseEvent);
      }}>
      <Image
        style={[styles.image]}
        source={
          element.thumbnailImage
            ? {uri: element.thumbnailImage.url}
            : require("../../../assets/grey-background.jpg")
        }
      />
      {element.style === "VIDEO" || element.style === "PLAYLIST" ? (
        <Text style={styles.videoTitleStyle}>{element.title}</Text>
      ) : null}
      {element.style === "PLAYLIST" ? (
        <View style={styles.playlistIcon}>
          <Icon source={"book"} color={"white"} size={40} />
        </View>
      ) : null}
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
  videoTitleStyle: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    color: "white",
    fontSize: 35,
    fontWeight: "bold",
    textAlign: "center",
    marginVertical: 20,
    textShadowColor: "black",
    textShadowOffset: {width: 5, height: 5},
    textShadowRadius: 10,
  },
  playlistIcon: {
    position: "absolute",
    bottom: 0,
    right: 0,
    left: 0,
    alignItems: "flex-start",
    padding: 20,
    backgroundColor: "#11111199",
    borderBottomStartRadius: 15,
    borderBottomEndRadius: 15,
  },
});

function numberToPercent(number: number) {
  return `${number * 100}%` as DimensionValue;
}
