import React, {useState} from "react";
import {Pressable, StyleProp, ViewStyle} from "react-native";

import {useTVRemoteEvent} from "@/ui/tv";

// TODO: Long Press not working always maybe use TVEvent instead?

type Props = {
  style?: StyleProp<ViewStyle>;
  onLongPress?: () => void;
  onPress?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  children: React.ReactNode;
};

export default function VideoTouchable({
  onLongPress,
  onPress,
  onFocus,
  onBlur,
  children,
  style,
}: Props) {
  const [focus, setFocus] = useState(false);

  // Only the focused instance subscribes, so a list of these does not put one
  // remote listener per row behind every key press.
  useTVRemoteEvent(event => {
    if (onLongPress && event.eventType === "longSelect") {
      onLongPress();
    }
  }, focus);

  return (
    <Pressable
      onPress={() => {
        console.log("Press");
        onPress?.();
      }}
      onLongPress={() => console.log("LongPress")}
      onFocus={() => {
        setFocus(true);
        onFocus?.();
      }}
      onBlur={() => {
        setFocus(false);
        onBlur?.();
      }}
      onPressIn={() => console.log("PressIn")}
      onPressOut={() => console.log("PressOut")}
      style={[style, {opacity: focus ? 0.5 : 1}]}>
      {children}
    </Pressable>
  );
}
