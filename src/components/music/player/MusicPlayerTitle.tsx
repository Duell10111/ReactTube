import {StyleSheet, View} from "react-native";

import {useMusikPlayerContext} from "../../../context/MusicPlayerContext";

import {AppText} from "@/ui/components";

export function MusicPlayerTitle() {
  const {currentItem} = useMusikPlayerContext();

  return (
    <View style={styles.textContainer}>
      <AppText align={"center"} variant={"titleMedium"}>
        {currentItem?.title}
      </AppText>
      <AppText align={"center"} color={"textSecondary"}>
        {currentItem?.author?.name}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  textContainer: {
    justifyContent: "center",
    alignItems: "center",
    flex: 1,
  },
});
