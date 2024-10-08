import {StyleSheet, Text} from "react-native";

import {useAppStyle} from "@/context/AppStyleContext";
import {HorizontalData} from "@/extraction/ShelfExtraction";

interface MusicDescriptionHorizontalItemProps {
  data: HorizontalData;
}

export function MusicDescriptionHorizontalItem({
  data,
}: MusicDescriptionHorizontalItemProps) {
  const {style} = useAppStyle();

  return (
    <Text style={[styles.textStyle, {color: style.textColor}]}>
      {data.title}
    </Text>
  );
}

const styles = StyleSheet.create({
  textStyle: {
    fontSize: 15,
    paddingBottom: 10,
    marginVertical: 10,
  },
});
