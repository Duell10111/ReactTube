import {CommonActions, useNavigation, useRoute} from "@react-navigation/native";
import {Icon} from "@rneui/base";
import {Image} from "expo-image";
import _ from "lodash";
import React, {useMemo} from "react";
import {
  StyleProp,
  StyleSheet,
  Text,
  TouchableNativeFeedback,
  useWindowDimensions,
  View,
  ViewStyle,
} from "react-native";

import ChannelIcon from "@/components/video/ChannelIcon";
import {useAppStyle} from "@/context/AppStyleContext";
import {ElementData, VideoData} from "@/extraction/Types";
import {NativeStackProp, RootRouteProp} from "@/navigation/types";
import Logger from "@/utils/Logger";

const LOGGER = Logger.extend("LIBRARY_CARD");

interface LibraryElementCardProps {
  element: ElementData;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  width?: ViewStyle["width"];
}

export function LibraryElementCard({
  element,
  style,
  ...props
}: LibraryElementCardProps) {
  const {style: appStyle} = useAppStyle();
  const {width} = useWindowDimensions();

  const navigation = useNavigation<NativeStackProp>();
  const route = useRoute<RootRouteProp>();

  const onPress = () => {
    if (props.onPress) {
      props.onPress();
      return;
    }

    // TODO: Add init seconds params

    LOGGER.debug("State: ", navigation.getState());
    LOGGER.debug("Route name: ", route.name);
    LOGGER.debug("Nav Endpoint: ", element.navEndpoint);
    if (route.name === "VideoScreen") {
      LOGGER.debug("Replacing Video Screen");
      navigation.replace("VideoScreen", {
        videoId: element.id,
        navEndpoint: element.navEndpoint,
        reel: element.type === "reel",
      });
    } else if (
      // @ts-ignore
      navigation.getState().routes.find(r => r.name === "VideoScreen")
    ) {
      LOGGER.debug("Remove all existing Video Screens");
      navigation.dispatch(state => {
        // @ts-ignore
        const routes = state.routes.filter(r => r.name !== "VideoScreen");
        routes.push({
          // @ts-ignore
          name: "VideoScreen",
          // @ts-ignore
          params: {
            videoId: element.id,
            navEndpoint: element.id,
            reel: element.type === "reel",
          },
        });

        return CommonActions.reset({
          ...state,
          routes,
          index: routes.length - 1,
        });
      });
    } else {
      navigation.navigate("VideoScreen", {
        videoId: element.id,
        navEndpoint: element.navEndpoint,
        reel: element.type === "reel",
      });
    }
  };

  const onPressPlaylist = () => {
    const routeName = element.music ? "MusicPlaylistScreen" : "PlaylistScreen";
    if (route.name === routeName) {
      navigation.replace(routeName, {playlistId: element.id});
    } else {
      navigation.navigate(routeName, {
        playlistId: element.id,
      });
    }
  };

  const subtitleContent = useMemo(() => {
    return _.chain([
      element.author?.name,
      element.short_views,
      element.publishDate,
    ])
      .compact()
      .value();
  }, [element]);

  return (
    <View style={[styles.container, {minWidth: 150, maxWidth: width}, style]}>
      <TouchableNativeFeedback
        onPress={element.type === "playlist" ? onPressPlaylist : onPress}>
        <View style={[styles.segmentContainer]}>
          <Image
            style={styles.imageStyle}
            resizeMode={"cover"}
            source={{
              uri: element.thumbnailImage?.url,
            }}
          />
          {element.type === "video" && element.duration ? (
            <Text style={styles.countContainer}>{element.duration}</Text>
          ) : null}
        </View>
      </TouchableNativeFeedback>
      <View style={styles.metadataContainer}>
        {element.author?.thumbnail ? (
          <ChannelIcon
            channelId={element.author?.id ?? ""}
            thumbnailUrl={element.author?.thumbnail.url}
            imageStyle={{width: 50, height: 50}}
          />
        ) : null}
        <View style={styles.titleContainer}>
          <Text style={[styles.titleStyle, {color: appStyle.textColor}]}>
            {element.title}
          </Text>
          {subtitleContent.length > 0 ? (
            <Text style={[styles.subtitleStyle, {color: appStyle.textColor}]}>
              {subtitleContent.join(" · ")}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    // backgroundColor: "blue",
    marginVertical: 5,
    flex: 0,
  },
  segmentContainer: {
    backgroundColor: "#aaaaaa",
    // borderRadius: 25,
    overflow: "hidden",
    aspectRatio: 1.7,
    alignItems: "center",
  },
  imageStyle: {
    width: "100%",
    height: "100%",
    // backgroundColor: "grey", // TODO: REMOVE?
  },
  metadataContainer: {
    width: "100%",
    flexDirection: "row",
    // backgroundColor: "purple",
  },
  titleContainer: {
    justifyContent: "flex-start",
    marginStart: 10,
    marginEnd: 10,
    // backgroundColor: "red",
    width: "85%",
  },
  titleStyle: {
    fontSize: 15,
    maxHeight: 50,
    flexWrap: "wrap",
    paddingEnd: 20,
  },
  subtitleStyle: {
    fontSize: 12,
  },
  countContainer: {
    position: "absolute",
    right: 10,
    bottom: 10,
    color: "white",
    backgroundColor: "black",
    padding: 5,
    fontSize: 15,
  },
  liveContainer: {
    position: "absolute",
    left: 10,
    bottom: 10,
    backgroundColor: "black",
    padding: 5,
    fontSize: 20,
    flexDirection: "row",
    alignItems: "center",
  },
  liveStyle: {
    fontSize: 15,
    color: "red",
  },
  bottomBorder: {
    position: "absolute",
    left: 0,
    bottom: 0,
    right: 0,
    height: "20%",
    backgroundColor: "#111111bb",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    paddingHorizontal: 15,
  },
});