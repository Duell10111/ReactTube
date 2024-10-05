import {StyleSheet, Text, View} from "react-native";

import {PlaylistHeaderButton} from "@/components/playlists/tv/PlaylistHeaderButton";
import {useAppStyle} from "@/context/AppStyleContext";
import {YTPlaylist} from "@/extraction/Types";

interface PlaylistHeaderProps {
  playlist: YTPlaylist;
  onPlayAllPress?: () => void;
  onPlaySavePlaylist?: (save: boolean) => void;
}

export function PlaylistHeader({
  playlist,
  onPlayAllPress,
  onPlaySavePlaylist,
}: PlaylistHeaderProps) {
  const {style} = useAppStyle();

  const saved =
    playlist.menu.top_level_buttons.findIndex(
      item => item.icon_type === "PLAYLIST_ADD",
    ) > 0;

  return (
    <View style={styles.container}>
      <Text style={[styles.titleStyle, {color: style.textColor}]}>
        {playlist.title}
      </Text>
      <View style={styles.subtitleContainer}>
        <Text style={[styles.subtitleStyle, {color: style.textColor}]}>
          {[playlist.author.name, `${playlist.items.length} Videos`].join(
            " - ",
          )}
        </Text>
      </View>
      {playlist.description ? (
        <Text style={{color: style.textColor}}>{playlist.description}</Text>
      ) : null}
      <View style={styles.buttonContainer}>
        {/* TODO: Play Buttons */}
        <PlaylistHeaderButton
          iconName={"play"}
          iconType={"font-awesome-5"}
          text={"Play playlist"}
          onPress={onPlayAllPress}
        />
        <PlaylistHeaderButton
          iconName={saved ? "bookmark-o" : "bookmark"}
          iconType={"font-awesome-5"}
          text={"Save playlist"}
          onPress={() => onPlaySavePlaylist?.(saved)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: "80%",
    width: "50%",
    // backgroundColor: "orange",
    paddingHorizontal: 50,
    alignItems: "flex-start",
  },
  titleStyle: {
    fontSize: 30,
  },
  subtitleContainer: {
    flex: 0,
    flexDirection: "row",
  },
  subtitleStyle: {
    fontSize: 18,
  },
  buttonContainer: {
    flex: 1,
    marginVertical: 20,
  },
});
