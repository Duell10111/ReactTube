import {Dispatch, SetStateAction} from "react";
import {
  GestureResponderHandlers,
  StyleSheet,
  TouchableHighlight,
  TouchableOpacity,
  View,
} from "react-native";

interface SeekbarProps {
  seekerFillWidth: number;
  seekerPosition: number;
  seekColor: string;
  seekerPanHandlers: GestureResponderHandlers;
  setSeekerWidth: Dispatch<SetStateAction<number>>;
  onFocus?: () => void;
  onBlur?: () => void;
}

export default function Seekbar({
  seekColor,
  seekerFillWidth,
  seekerPosition,
  seekerPanHandlers,
  setSeekerWidth,
  onFocus,
  onBlur,
}: SeekbarProps) {
  return (
    <View style={styles.container} collapsable={false} {...seekerPanHandlers}>
      <View
        style={styles.track}
        onLayout={event => setSeekerWidth(event.nativeEvent.layout.width)}
        pointerEvents={"none"}>
        <View
          style={[
            styles.fill,
            {
              width: seekerFillWidth,
              backgroundColor: seekColor || "#FFF",
            },
          ]}
          pointerEvents={"none"}
        />
      </View>
      <View
        style={[styles.handle, {left: seekerPosition}]}
        pointerEvents={"none"}>
        <TouchableOpacity onFocus={onFocus} onBlur={onBlur}>
          <View
            style={[styles.circle, {backgroundColor: seekColor || "#FFF"}]}
            pointerEvents={"none"}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: "stretch",
    height: 28,
    marginLeft: 20,
    marginRight: 20,
  },
  track: {
    backgroundColor: "#333",
    height: 1,
    position: "relative",
    top: 14,
    width: "100%",
  },
  fill: {
    backgroundColor: "#FFF",
    height: 1,
    width: "100%",
  },
  handle: {
    position: "absolute",
    marginLeft: -7,
    height: 32,
    width: 32,
  },
  circle: {
    borderRadius: 12,
    position: "relative",
    top: 8,
    left: -5,
    height: 12,
    width: 12,
  },
});
