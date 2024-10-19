import {StyleSheet, Text, TouchableOpacity, View} from "react-native";

import {MusicPlaylistItem} from "@/components/music/MusicPlaylistItem";
import {MusicSearchListItem} from "@/components/music/MusicSearchListItem";
import {HorizontalData} from "@/extraction/ShelfExtraction";
import {ElementData, VideoData} from "@/extraction/Types";

interface MusicSearchSectionItemProps {
  data: HorizontalData;
  onPress?: () => void;
}

export default function MusicSearchSectionItem({
  data,
  onPress,
}: MusicSearchSectionItemProps) {
  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.headerContainer} onPress={onPress}>
        <Text style={styles.titleStyle}>{data.title}</Text>
        {/* TODO: Adapt Button style to match YT Music*/}
        <Text style={styles.moreText}>{"More"}</Text>
      </TouchableOpacity>
      <View style={styles.itemContainer}>
        {data.parsedData.map(element => (
          <MusicSearchListItem key={element.id} data={element as VideoData} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 5,
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 10,
  },
  titleStyle: {
    flex: 1,
    fontSize: 25,
    color: "white",
  },
  moreText: {
    marginHorizontal: 10,
    color: "white",
  },
  itemContainer: {
    // marginHorizontal: 5,
  },
});
