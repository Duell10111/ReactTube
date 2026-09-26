import {StyleSheet, View} from "react-native";

import {AppButton} from "@/ui/components";

interface LibraryHeaderTVItemProps {
  title: string;
  onPress?: () => void;
}

export function LibraryHeaderTVItem({
  title,
  onPress,
}: LibraryHeaderTVItemProps) {
  return (
    <View style={styles.container}>
      <AppButton label={title} onPress={onPress} variant={"secondary"} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minWidth: 220,
    marginHorizontal: 25,
  },
});
