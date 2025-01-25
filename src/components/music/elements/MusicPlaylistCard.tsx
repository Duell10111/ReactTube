import {useNavigation, useRoute} from "@react-navigation/native";
import {
  Image,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";

import {PlaylistData} from "@/extraction/Types";
import {NativeStackProp, RootRouteProp} from "@/navigation/types";

interface MusicPlaylistCardProps {
  data: PlaylistData;
  style?: StyleProp<ViewStyle>;
}

export function MusicPlaylistCard({data, style}: MusicPlaylistCardProps) {
  const navigation = useNavigation<NativeStackProp>();
  const route = useRoute<RootRouteProp>();

  const onPress = () => {
    const routeName =
      data.type === "album" ? "MusicAlbumScreen" : "MusicPlaylistScreen";
    if (route.name === routeName) {
      // @ts-ignore TODO: fix
      navigation.replace(routeName, {playlistId: data.id, albumId: data.id});
    } else {
      // @ts-ignore As Unknown Parameter is not used
      navigation.navigate(routeName, {
        playlistId: data.id,
        albumId: data.id,
      });
    }
  };

  return (
    <TouchableOpacity onPress={onPress}>
      <View style={[styles.container, style]}>
        <Image
          style={styles.imageStyle}
          source={{uri: data.thumbnailImage.url}}
          resizeMode={"cover"}
        />
        <Text style={styles.titleStyle}>{data.title}</Text>
        <Text style={styles.subtitleStyle}>{data.subtitle}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    // width: 500,
  },
  imageStyle: {
    aspectRatio: 1,
    width: "100%",
    borderRadius: 5,
  },
  titleStyle: {
    fontSize: 17,
    color: "white",
  },
  subtitleStyle: {
    fontSize: 12,
    color: "white",
  },
});
