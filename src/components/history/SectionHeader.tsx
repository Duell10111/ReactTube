import {StyleSheet, Text, View} from "react-native";

import {useAppStyle} from "@/context/AppStyleContext";

interface SectionHeaderProps {
  title: string;
}

export function SectionHeader({title}: SectionHeaderProps) {
  const {style: appStyle} = useAppStyle();

  return (
    <View style={styles.container}>
      <Text style={[styles.titleStyle, {color: appStyle.textColor}]}>
        {title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#111111",
    paddingVertical: 10,
  },
  titleStyle: {
    fontSize: 18,
  },
});
