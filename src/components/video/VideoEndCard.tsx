import {useNavigation} from "@react-navigation/native";
import React, {useEffect, useState} from "react";
import {DimensionValue, StyleSheet, TouchableOpacity, View} from "react-native";
import FastImage from "react-native-fast-image";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import {YTEndscreen, YTEndscreenElement} from "../../extraction/Types";
import {RootNavProp} from "../../navigation/RootStackNavigator";

// TODO: Remove Animations?

interface VideoEndCardProps {
  endcard: YTEndscreen;
  visisble?: boolean;
  currentTime?: number;
}

export default function VideoEndCard({
  endcard,
  visisble,
  currentTime,
}: VideoEndCardProps) {
  const {showEndCard, containerStyle} = useAnimation();
  const [show, setShow] = useState(false);

  // console.log("Start Duration: ", endcard.startDuration);
  // console.log("Current Time: ", currentTime);
  // console.log("Show Endcard", showEndCard.value);
  // console.log("Show", show);

  useEffect(() => {
    if (currentTime && endcard.startDuration <= currentTime) {
      showEndCard.value = true;
      setShow(true);
      console.log("Match");
    } else {
      console.log("Not matching");
    }
  }, [currentTime]);

  return (
    <Animated.View
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
    </Animated.View>
  );
}

interface VideoCardProps {
  element: YTEndscreenElement;
}

function VideoCard({element}: VideoCardProps) {
  //TODO: Different between channel and web?

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
        navigation.navigate("VideoScreen", {
          navEndpoint: element.navEndpoint,
          videoId: element.id, // TODO: Wrong id as not known :/
        });
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

function useAnimation() {
  const showEndCard = useSharedValue(false);

  const containerStyle = useAnimatedStyle(() => {
    return {
      opacity: withTiming(showEndCard.value ? 1 : 0),
    };
  });

  return {
    showEndCard,
    containerStyle,
  };
}
