import {useCallback} from "react";
import {FlatList, ListRenderItem, StyleSheet, Text, View} from "react-native";
import {Divider, Switch} from "react-native-paper";

import {MusicPlayerPlaylistListItem} from "@/components/music/player/MusicPlayerPlaylistListItem";
import {useMusikPlayerContext} from "@/context/MusicPlayerContext";
import {YTPlaylistPanelItem} from "@/extraction/Types";

export function MusicPlayerPlaylistAutomixList() {
  const {automix, setAutomix, automixPlaylist, setCurrentItem} =
    useMusikPlayerContext();

  const renderItem = useCallback<ListRenderItem<YTPlaylistPanelItem>>(
    ({item, index}) => (
      <MusicPlayerPlaylistListItem
        data={item}
        onPress={() => {
          setCurrentItem(item, false, true);
        }}
      />
    ),
    [],
  );

  return (
    <View style={styles.container}>
      <Divider bold style={styles.divider} />
      <View style={styles.buttonContainer}>
        <View style={styles.textContainer}>
          <Text
            style={
              styles.titleStyle
            }>{`Autoplay ${automix ? "enabled" : "disabled"}`}</Text>
          <Text style={styles.subtitleStyle}>
            {"Add similar songs to provide endless music"}
          </Text>
        </View>
        <Switch value={automix} onValueChange={amix => setAutomix(amix)} />
      </View>
      <FlatList
        data={automix ? (automixPlaylist?.items ?? []) : []}
        renderItem={renderItem}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 5,
  },
  divider: {
    marginTop: 5,
  },
  buttonContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 5,
    marginVertical: 10,
  },
  textContainer: {
    flex: 1,
  },
  titleStyle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "white",
  },
  subtitleStyle: {
    fontSize: 11,
    color: "white",
  },
});
