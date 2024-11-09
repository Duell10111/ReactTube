import {
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  ViewStyle,
} from "react-native";

interface SubscribeButtonProps {
  subscribed?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function SubscribeButton({
  subscribed,
  onPress,
  style,
}: SubscribeButtonProps) {
  return (
    <TouchableOpacity
      style={[
        styles.container,
        style,
        subscribed ? {backgroundColor: "lightblue"} : null,
      ]}
      onPress={onPress}>
      <Text style={styles.textStyle}>
        {subscribed ? "Subscribed" : "Subscribe"}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 25,
    backgroundColor: "white",
    padding: 8,
  },
  textStyle: {
    color: "black",
  },
});
