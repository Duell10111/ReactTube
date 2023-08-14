import React from "react";
import {
  StyleProp,
  StyleSheet,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import {Icon} from "@rneui/base";

interface Props {
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  hasTVPreferredFocus?: boolean;
}

export default function PlayButton({
  onPress,
  style,
  hasTVPreferredFocus,
}: Props) {
  return (
    <TouchableOpacity
      style={style}
      onPress={onPress}
      hasTVPreferredFocus={hasTVPreferredFocus}>
      <View style={styles.container}>
        <Icon name={"play"} type={"font-awesome-5"} size={20} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 5,
    borderColor: "grey",
    borderRadius: 30,
    padding: 15,
    backgroundColor: "#cccccc",
  },
});
