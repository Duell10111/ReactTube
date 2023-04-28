import React, {useCallback, useState} from "react";
import {Gesture, GestureDetector} from "react-native-gesture-handler";
import {Pressable, StyleProp, View, ViewStyle} from "react-native";
import {runOnJS} from "react-native-reanimated";

// TODO: Long Press not working always

type Props = {
  style?: StyleProp<ViewStyle>;
  onLongPress?: () => void;
  onPress?: () => void;
  onFocus?: () => void;
  children: React.ReactNode;
};

export default function VideoTouchable({
  onLongPress,
  onPress,
  onFocus,
  children,
  style,
}: Props) {
  const [focus, setFocus] = useState(false);

  const longPress = useCallback(() => onLongPress?.(), [onLongPress]);

  const tap = Gesture.LongPress().onStart(() => {
    console.log("tap");
    runOnJS(longPress)();
  });

  // useTVEventHandler(event => {
  //   if (onLongPress && focus && event.eventType === "longSelect") {
  //     onLongPress();
  //   } else {
  //     console.log("Event: ", event);
  //   }
  // });

  return (
    <GestureDetector gesture={tap}>
      <Pressable
        onPress={() => {
          console.log("Press");
          onPress && onPress();
        }}
        onLongPress={() => console.log("LongPress")}
        onFocus={() => {
          setFocus(true);
          onFocus?.();
        }}
        onBlur={() => setFocus(false)}
        onPressIn={() => console.log("PressIn")}
        onPressOut={() => console.log("PressOut")}
        style={[style, {opacity: focus ? 0.5 : 1}]}>
        {children}
      </Pressable>
    </GestureDetector>
  );
}

function FunctionalComponent(props) {
  return <View collapsable={false}>{props.children}</View>;
}
