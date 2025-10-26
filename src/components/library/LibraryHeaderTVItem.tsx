import {StyleSheet, Text, TouchableOpacity, ViewStyle} from "react-native";

interface LibraryHeaderTVItemProps {
  title: string;
  color: ViewStyle["backgroundColor"];
  onPress?: () => void;
}

export function LibraryHeaderTVItem({
  title,
  color,
  onPress,
}: LibraryHeaderTVItemProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.container, {backgroundColor: color}]}>
      <Text style={styles.textStyle}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 150,
    aspectRatio: 1,
    borderRadius: 25,
    marginHorizontal: 25,
    justifyContent: "center",
    alignItems: "center",
  },
  textStyle: {
    fontSize: 30,
    fontWeight: "bold",
    color: "white",
  },
});
