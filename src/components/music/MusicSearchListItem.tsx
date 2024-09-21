import {useNavigation} from "@react-navigation/native";
import {Icon} from "@rneui/base";
import {Image, StyleSheet, Text, TouchableOpacity, View} from "react-native";

import {useAppStyle} from "@/context/AppStyleContext";
import {useMusikPlayerContext} from "@/context/MusicPlayerContext";
import {ElementData} from "@/extraction/Types";
import {RootNavProp} from "@/navigation/RootStackNavigator";

interface MusicSearchListItemProps {
  data: ElementData;
}

export function MusicSearchListItem({data}: MusicSearchListItemProps) {
  const {style} = useAppStyle();
  const {navigate} = useNavigation<RootNavProp>();

  const {setCurrentItem} = useMusikPlayerContext();

  const onPress = () => {
    if (data.type === "video" || data.type === "mix") {
      setCurrentItem(data);
      navigate("MusicPlayerScreen", {
        videoId: data.id,
        navEndpoint: data.navEndpoint,
      });
    } else if (data.type === "playlist") {
      navigate("MusicPlaylistScreen", {
        playlistId: data.id,
      });
    } else if (data.type === "artist" || data.type === "channel") {
      navigate("MusicChannelScreen", {
        artistId: data.id,
      });
    } else if (data.type === "album") {
      navigate("MusicAlbumScreen", {
        albumId: data.id,
      });
    }
  };

  return (
    <TouchableOpacity onPress={onPress}>
      <View style={styles.container}>
        <Image
          style={styles.image}
          source={{uri: data.thumbnailImage.url}}
          resizeMode={"cover"}
        />
        <View style={styles.textContainer}>
          <Text style={{color: style.textColor}}>{data.title}</Text>
          <Text
            style={[
              {
                color: style.textColor,
              },
              styles.subtitleText,
            ]}>{`${data.type === "video" ? `${data.artists?.map(a => a.name)?.join(", ") ?? data.author?.name ?? ""} - ${data.duration}` : ""} - ${data.originalNode.type} `}</Text>
        </View>
        <Icon
          name={"dots-vertical"}
          type={"material-community"}
          color={"white"}
          size={16}
        />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
  },
  image: {
    borderRadius: 5,
    width: 55,
    height: 55,
  },
  textContainer: {
    justifyContent: "center",
    flex: 1,
    marginLeft: 15,
  },
  subtitleText: {
    fontSize: 12,
    fontWeight: "200",
  },
});
