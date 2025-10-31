import AntDesign from "@expo/vector-icons/AntDesign";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import React, {useEffect, useRef, useState} from "react";
import {
  ActivityIndicator,
  Dimensions,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import {Gesture, GestureDetector} from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import Video, {VideoRef} from "react-native-video";

import {handler} from "../handler";

import {CornerVideoProps, Measure} from "@/components/corner-video/types";

interface Props {
  currentTime: number;
  props: CornerVideoProps;
  positions: Measure;
  onClose?: () => void;
}

const CornerVideo = ({currentTime, props, positions, onClose}: Props) => {
  const {cornerProps, videoProps} = props;

  const [loaded, setLoaded] = useState<boolean>(false);
  const ref = useRef<VideoRef>(undefined);
  const width = useSharedValue(positions.w);
  const height = useSharedValue(positions.h);
  const top = useSharedValue(positions.y);
  const left = useSharedValue(positions.x);
  const dragX = useSharedValue(0);
  const dragY = useSharedValue(0);
  const offsetX = useSharedValue(0);
  const offsetY = useSharedValue(0);

  const screen_width = useSharedValue(Dimensions.get("window").width);
  const screen_height = useSharedValue(Dimensions.get("window").height);

  useEffect(() => {
    const sub = Dimensions.addEventListener("change", ({window}) => {
      screen_width.value = window.width;
      screen_height.value = window.height;
      // TODO: Adapt to not reset position
      // Reset position on screen rotation
      dragX.value = 0;
      dragY.value = 0;
      offsetX.value = 0;
      offsetY.value = 0;

      // const {x, y} = handler({
      //   e: {
      //     velocityX: 0,
      //     velocityY: 0,
      //     absoluteX: 0,
      //     absoluteY: 0,
      //   },
      //   props: {
      //     cornerProps,
      //     videoProps,
      //   },
      //   dimensions: {
      //     height: screen_height.value,
      //     width: screen_width.value,
      //   },
      // });
      // offsetX.value = x;
      // offsetY.value = y;
      // dragX.value = withSpring(x, {damping: 15});
      // dragY.value = withSpring(y, {damping: 15});
    });
    return () => sub.remove();
  }, []);

  // Player Controls
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    animate();
  }, []);

  useEffect(() => {
    setLoaded(false);
    // @ts-ignore
  }, [props.videoProps.source.uri]);

  const animate = () => {
    width.value = withSpring(cornerProps.width, {damping: 15});
    height.value = withSpring(cornerProps.height, {damping: 15});
    top.value = withSpring(cornerProps.top, {damping: 15});
    left.value = withSpring(cornerProps.left, {damping: 15});
  };

  const onGesture = Gesture.Pan()
    .onUpdate(e => {
      dragX.value = offsetX.value + e.translationX;
      dragY.value = offsetY.value + e.translationY;
    })
    .onEnd(e => {
      const {x, y} = handler({
        e,
        props: {
          cornerProps,
          videoProps,
        },
        dimensions: {
          height: screen_height.value,
          width: screen_width.value,
        },
      });
      offsetX.value = x;
      offsetY.value = y;
      dragX.value = withSpring(x, {damping: 15});
      dragY.value = withSpring(y, {damping: 15});
    });

  const dragStyle = useAnimatedStyle(() => {
    return {
      transform: [{translateX: dragX.value}, {translateY: dragY.value}],
    };
  });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      width: width.value,
      height: height.value,
      top: top.value,
      left: left.value,
    };
  });

  return (
    <GestureDetector gesture={onGesture}>
      <Animated.View
        style={[
          styles.cornerVideo,
          {
            width: positions.w,
            height: positions.h,
            top: positions.y,
            left: positions.x,
          },
          dragStyle,
          animatedStyle,
        ]}>
        <View style={styles.videoContainer}>
          <Video
            // @ts-ignore Ignore Mutable Ref type issue
            ref={ref}
            style={styles.videoPlayer}
            resizeMode={"cover"}
            onReadyForDisplay={() => {
              setLoaded(true);
              ref.current?.seek(currentTime);
            }}
            source={{
              // @ts-ignore
              uri: videoProps.source.uri,
            }}
            paused={paused}
          />
          {!loaded && (
            <ActivityIndicator
              style={{position: "absolute"}}
              color={"#444"}
              size={"small"}
            />
          )}
        </View>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onClose}
          style={styles.closeBtn}>
          <AntDesign name={"close"} size={24} color={"white"} />
        </TouchableOpacity>
        <View
          style={{
            flex: 1,
            backgroundColor: "black",
            height: 75,
            width: "100%",
            alignItems: "center",
            justifyContent: "space-around",
            flexDirection: "row",
          }}>
          <FontAwesome6
            name={"backward"}
            size={24}
            color={"white"}
            onPress={() => {
              ref.current?.getCurrentPosition().then(position => {
                ref.current?.seek(position - 15);
              });
            }}
          />
          <FontAwesome6
            name={paused ? "play" : "pause"}
            size={24}
            color={"white"}
            onPress={() => setPaused(!paused)}
          />
          <FontAwesome6
            name={"forward"}
            size={24}
            color={"white"}
            onPress={() => {
              ref.current?.getCurrentPosition().then(position => {
                ref.current?.seek(position + 15);
              });
            }}
          />
        </View>
      </Animated.View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  cornerVideo: {
    width: 150,
    height: 100,
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
    top: 50,
    left: 7,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#EEE",
  },
  videoContainer: {
    height: "80%",
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  videoPlayer: {
    width: "100%",
    height: "100%", // TODO: Replace with 100% if controls not added
  },
  closeBtn: {
    justifyContent: "center",
    alignItems: "center",
    position: "absolute",
    top: 5,
    left: 5,
    width: 25,
    height: 25,
    borderRadius: 15,
    backgroundColor: "rgba(0,0,0, .4)",
  },
  closeImg: {
    tintColor: "#fff",
    width: 10,
    height: 10,
  },
});

export default CornerVideo;
