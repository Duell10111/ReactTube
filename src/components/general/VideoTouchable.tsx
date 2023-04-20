import React, {useCallback, useState} from "react";
import {
  Gesture,
  GestureDetector,
  TouchableOpacity,
} from "react-native-gesture-handler";
import {Pressable, StyleProp, View, ViewStyle} from "react-native";
import {runOnJS} from "react-native-reanimated";

type Props = {
  style?: StyleProp<ViewStyle>;
  onLongPress?: () => void;
  onPress?: () => void;
  children: React.ReactNode;
};

export default function VideoTouchable({
  onLongPress,
  onPress,
  children,
  style,
}: Props) {
  const [focus, setFocus] = useState(false);

  const longPress = useCallback(() => onLongPress?.(), [onLongPress]);

  const tap = Gesture.LongPress().onStart(() => {
    console.log("tap");
    runOnJS(longPress)();
  });

  return (
    <GestureDetector gesture={tap}>
      <Pressable
        onPress={() => {
          console.log("Press");
          onPress && onPress();
        }}
        onLongPress={() => console.log("LongPress")}
        onFocus={() => setFocus(true)}
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
