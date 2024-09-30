import {Icon, IconType} from "@rneui/base";
import {StyleSheet, Text, TouchableOpacity, View} from "react-native";

interface MusicPlayerActionButtonProps {
  iconName?: string;
  iconType?: IconType;
  title?: string;
  color?: string;
  onPress?: () => void;
}

export function MusicPlayerActionButton({
  iconName,
  iconType,
  title,
  onPress,
}: MusicPlayerActionButtonProps) {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      {iconName && iconType ? (
        <Icon name={iconName} type={iconType} color={"white"} />
      ) : null}
      <Text style={styles.title}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 0,
    flexDirection: "row",
    backgroundColor: "#555",
    borderRadius: 25,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  title: {
    marginStart: 5,
    fontSize: 18,
    color: "white",
  },
});
