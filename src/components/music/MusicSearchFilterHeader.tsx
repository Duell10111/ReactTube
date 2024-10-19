import {Icon} from "@rneui/base";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableHighlight,
  View,
} from "react-native";

import {YTChipCloud, YTChipCloudChip} from "@/extraction/Types";

interface MusicSearchFilterHeaderProps {
  closeable?: boolean;
  onClose?: () => void;
  data: YTChipCloud;
  onClick?: (chip: YTChipCloudChip) => void;
}

export function MusicSearchFilterHeader({
  data,
  closeable,
  onClose,
  onClick,
}: MusicSearchFilterHeaderProps) {
  return (
    <View style={styles.container}>
      {closeable ? (
        <Icon
          name={"close"}
          type={"antdesign"}
          color={"black"}
          containerStyle={styles.exitButtonStyle}
          onPress={onClose}
        />
      ) : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {data.chip_clouds.map(chip => (
          <FilterCloud
            key={chip.text}
            text={chip.text}
            selected={chip.isSelected}
            onPress={() => onClick(chip)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

interface FilterCloudProps {
  text: string;
  selected?: boolean;
  onPress?: () => void;
}

function FilterCloud({text, onPress, selected}: FilterCloudProps) {
  return (
    <TouchableHighlight
      style={[
        styles.filterContainer,
        selected ? {backgroundColor: "white"} : {},
      ]}
      onPress={onPress}>
      <Text style={[styles.filterText, selected ? {color: "black"} : {}]}>
        {text}
      </Text>
    </TouchableHighlight>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    height: 50,
    alignItems: "center",
    marginHorizontal: 5,
  },
  exitButtonStyle: {
    backgroundColor: "white",
    borderRadius: 5,
    padding: 2,
  },
  filterContainer: {
    borderRadius: 5,
    padding: 5,
    borderWidth: 1,
    borderColor: "#333333",
    marginHorizontal: 5,
  },
  filterText: {
    color: "white",
  },
});
