import {Icon} from "@rneui/base";
import React, {forwardRef} from "react";
import {
  StyleProp,
  StyleSheet,
  TouchableOpacity,
  TouchableOpacityProps,
  View,
  ViewStyle,
} from "react-native";

import TouchableField from "../../general/TouchableField";

interface Props extends TouchableOpacityProps {
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
}

const PlayButton = forwardRef<TouchableOpacity, Props>(
  ({onPress, style, ...props}, ref) => {
    return (
      <TouchableField
        ref={ref}
        style={style}
        containerStyle={{width: "100%"}}
        onPress={onPress}
        hasTVPreferredFocus
        {...props}>
        <View style={styles.container}>
          <Icon name={"play"} type={"font-awesome-5"} size={20} />
        </View>
      </TouchableField>
    );
  },
);

export default PlayButton;

const styles = StyleSheet.create({
  container: {
    borderWidth: 5,
    borderColor: "grey",
    borderRadius: 30,
    padding: 15,
    backgroundColor: "#cccccc",
  },
});
