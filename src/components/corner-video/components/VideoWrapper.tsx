import React, {useRef, useState} from "react";
import {TouchableOpacity} from "react-native";
import Video, {VideoRef} from "react-native-video";
import type {OnProgressData} from "react-native-video";

import {VideoProvider} from "../VideoProvider";

import {CornerVideoProps, Measure} from "@/components/corner-video/types";

let currentTime: number = 0;

const VideoWrapper = React.forwardRef<VideoRef, CornerVideoProps>(
  (props, ref) => {
    const cornerRef = useRef(TouchableOpacity.prototype);
    const [pos, setPos] = useState<Measure>({w: 0, h: 0, x: 0, y: 0});

    const onLayout = () => {
      cornerRef?.current?.measure((_x, _y, w, h, pageX, pageY) => {
        setPos({w, h, x: pageX, y: pageY});
      });
    };

    const onProgress = (data: OnProgressData) => {
      currentTime = data.currentTime;
      props.videoProps.onVideoProgress &&
        props.videoProps.onVideoProgress(data);
    };

    const onPress = () => {
      props.onPress && props.onPress();
      // @ts-ignore
      VideoProvider.show(pos, props, currentTime, props.videoProps.source.uri);
    };

    return (
      <TouchableOpacity
        style={props.style}
        onLayout={onLayout}
        ref={cornerRef}
        activeOpacity={1}
        onLongPress={onPress}>
        <Video
          style={props.style}
          ref={ref}
          {...props.videoProps}
          onProgress={onProgress}
        />
        {props.children}
      </TouchableOpacity>
    );
  },
);

export default VideoWrapper;
