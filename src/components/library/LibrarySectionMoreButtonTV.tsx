import {Icon} from "@rneui/base";
import {StyleSheet, TouchableOpacity, View} from "react-native";

interface LibrarySectionMoreButtonTVProps {
  onPress?: () => void;
}

export function LibrarySectionMoreButtonTV({
  onPress,
}: LibrarySectionMoreButtonTVProps) {
  return (
    <View style={styles.container}>
      <Icon
        // @ts-ignore
        Component={TouchableOpacity}
        name={"more-horiz"}
        type={"material"}
        raised
        onPress={onPress}
        size={100}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignSelf: "center",
    alignItems: "center",
    flex: 1,
  },
});
