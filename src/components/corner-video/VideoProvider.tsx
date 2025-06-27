/* eslint-disable react-hooks/exhaustive-deps */
import React, {useEffect, useRef, useState} from "react";
import {StyleSheet, View} from "react-native";
import {GestureHandlerRootView} from "react-native-gesture-handler";

import CornerVideo from "./components/CornerVideo";

import {CornerVideoProps, Measure} from "@/components/corner-video/types";

let ref: any = null;

interface VideoProviderProps {
  children: React.ReactNode;
}

export const VideoProvider = (props: VideoProviderProps) => {
  const viewRef = useRef(undefined);
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [positions, setPositions] = useState<Measure>({
    w: 0,
    h: 0,
    x: 0,
    y: 0,
  });
  const [cornerProps, setCornerProps] = useState<CornerVideoProps>({
    cornerProps: {
      width: 0,
      height: 0,
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    },
    videoProps: {
      // @ts-ignore
      source: {uri: ""},
    },
  });
  const [currentTime, setCurrentTime] = useState<number>(0);

  useEffect(() => {
    ref = viewRef;
  }, []);

  const show = (
    _pos: Measure,
    _cornerProps: CornerVideoProps,
    _currentTime: number,
    _videoUri: string,
  ) => {
    setPositions(_pos);
    setCornerProps({
      cornerProps: _cornerProps.cornerProps,
      // @ts-ignore
      videoProps: {source: {uri: _videoUri}},
    });
    setCurrentTime(_currentTime);
    setIsVisible(true);
  };

  const hide = () => {
    setIsVisible(false);
  };

  React.useImperativeHandle(
    viewRef,
    // @ts-ignore
    React.useCallback(
      () => ({
        show,
        hide,
      }),
      [show, hide],
    ),
  );

  return (
    <GestureHandlerRootView style={styles.container}>
      <View ref={ref} style={styles.container}>
        {props.children}
        {isVisible && (
          <CornerVideo
            currentTime={currentTime}
            positions={positions}
            props={cornerProps}
            onClose={() => VideoProvider.hide()}
          />
        )}
      </View>
    </GestureHandlerRootView>
  );
};

VideoProvider.show = (
  pos: Measure,
  cornerProps: CornerVideoProps,
  currentTime: number,
  videoUri: string,
) => {
  ref?.current?.show(pos, cornerProps, currentTime, videoUri);
};

VideoProvider.hide = () => {
  ref?.current?.hide();
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
