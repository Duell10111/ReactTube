import {StyleSheet, Text, TouchableOpacity} from "react-native";

interface TabProps {
  title: string;
  onPress?: () => void;
}

export function Tab({title, onPress}: TabProps) {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <Text style={styles.title}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 60,
    padding: 20,
    margin: 5,
    borderRadius: 15,
    backgroundColor: "#222222",
    justifyContent: "center",
  },
  title: {
    fontSize: 18,
    color: "white",
  },
});
