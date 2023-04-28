import React, {useCallback, useMemo, useRef, useState} from "react";
import {VLCPlayer, VlCPlayerView} from "react-native-vlc-media-player";
import {StyleSheet, useTVEventHandler, View} from "react-native";

interface Progress {
  currentTime: number;
  duration: number;
  position: number;
  remainingTime: number;
  target: number;
}

interface Props extends React.ComponentPropsWithoutRef<VLCPlayer> {}

export default function VLCPlayerControls(props: Props) {
  const player = useRef<VLCPlayer>();
  const progress = useRef<Progress | undefined>(undefined);
  const pause = useRef(false);

  const onProgress = useCallback(p => (progress.current = p), []);

  const source = useMemo(() => props.source, []);

  console.log("Progress: ", progress.current);

  useTVEventHandler(event => {
    if (event.eventType === "playPause") {
      pause.current = !pause.current;
      player.current.setNativeProps({paused: pause.current});
    } else if (event.eventType === "right") {
      progress.current && player.current.seek(0.5);
    }
  });

  return (
    <>
      <VLCPlayer ref={player} source={props.source} style={props.style} />
    </>
  );
}
