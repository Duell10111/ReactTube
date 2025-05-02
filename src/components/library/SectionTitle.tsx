import {StyleSheet, Text} from "react-native";

interface SectionTitleProps {
  title: string;
}

export function SectionTitle({title}: SectionTitleProps) {
  return <Text style={styles.titleStyle}>{title}</Text>;
}

const styles = StyleSheet.create({
  titleStyle: {
    color: "white",
    fontSize: 30,
    fontWeight: "bold",
    margin: 20,
  },
});
