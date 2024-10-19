import {Image} from "expo-image";
import {StyleSheet, Text, View} from "react-native";

import {PlaylistHeaderButton} from "@/components/playlists/phone/PlaylistHeaderButton";
import {useAppStyle} from "@/context/AppStyleContext";
import {YTPlaylist} from "@/extraction/Types";

interface PlaylistHeaderProps {
  playlist: YTPlaylist;
  saved?: boolean;
  onPlayAllPress?: () => void;
  onSavePlaylist?: () => void;
}

export function PlaylistHeader({
  playlist,
  saved,
  onSavePlaylist,
  onPlayAllPress,
}: PlaylistHeaderProps) {
  const {style: appStyle} = useAppStyle();

  return (
    <View style={styles.container}>
      <Image
        style={styles.imageStyle}
        source={{uri: playlist.thumbnailImage.url}}
      />
      <View style={styles.titleContainer}>
        <Text style={[styles.titleStyle, {color: appStyle.textColor}]}>
          {playlist.title}
        </Text>
        <Text style={[{color: appStyle.textColor}]}>
          {playlist.author?.name}
        </Text>
        <Text style={[{color: appStyle.textColor}]}>
          {playlist.description}
        </Text>
        <View style={styles.buttonContainer}>
          <PlaylistHeaderButton
            iconName={"play"}
            iconType={"font-awesome"}
            text={"Play all"}
            backgroundColor={"white"}
            textColor={"black"}
            onPress={onPlayAllPress}
          />
          {saved !== undefined ? (
            <PlaylistHeaderButton
              iconName={saved ? "bookmark" : "bookmark-o"}
              iconType={"font-awesome"}
              backgroundColor={"grey"}
              onPress={onSavePlaylist}
            />
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    alignSelf: "center",
    alignItems: "center",
    paddingHorizontal: 10,
  },
  imageStyle: {
    width: "100%",
    aspectRatio: 1.7,
    borderRadius: 5,
  },
  titleContainer: {
    width: "100%",
    alignItems: "flex-start",
  },
  titleStyle: {
    fontSize: 25,
    fontWeight: "bold",
    textAlign: "left",
  },
  buttonContainer: {
    width: "100%",
    flexDirection: "row",
  },
});
