import {useNavigation} from "@react-navigation/native";
import {Icon} from "@rneui/base";
import {Image, StyleSheet, Text, TouchableOpacity, View} from "react-native";

import {useAppStyle} from "@/context/AppStyleContext";
import {useMusikPlayerContext} from "@/context/MusicPlayerContext";
import {VideoData} from "@/extraction/Types";
import {RootNavProp} from "@/navigation/RootStackNavigator";

interface MusicPlaylistItemProps {
  data: VideoData;
  index: number;
}

export function MusicPlaylistItem({
  data,
  index,
}: MusicPlaylistItemProps): JSX.Element {
  const {style} = useAppStyle();
  const {navigate} = useNavigation<RootNavProp>();

  // console.log("NavEndpoint: ", JSON.stringify(data.navEndpoint));
  // const originalItem = data.originalNode.as(YTNodes.MusicResponsiveListItem);
  // console.log("ORG: ", originalItem.overlay.content.endpoint);

  const {setCurrentItem} = useMusikPlayerContext();

  return (
    <TouchableOpacity
      onPress={() => {
        setCurrentItem(data);
        navigate("MusicPlayerScreen", {
          videoId: data.id,
          navEndpoint: data.navEndpoint,
        });
      }}>
      <View style={styles.container}>
        {data.thumbnailImage ? (
          <Image
            style={styles.image}
            source={{uri: data.thumbnailImage.url}}
            resizeMode={"cover"}
          />
        ) : (
          <View style={[styles.image, styles.countImage]}>
            <Text style={styles.countText}>{index + 1}</Text>
          </View>
        )}
        <View style={styles.textContainer}>
          <Text style={{color: style.textColor}}>{data.title}</Text>
          <Text
            style={[
              {
                color: style.textColor,
              },
              styles.subtitleText,
            ]}>{`${data.type === "video" ? `${data.artists?.map(a => a.name)?.join(", ") ?? data.author?.name ?? ""} - ${data.duration}` : ""} - ${data.originalNode.type}`}</Text>
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
    width: 60,
    height: 60,
  },
  countImage: {
    alignItems: "center",
    justifyContent: "center",
  },
  countText: {
    color: "white",
    fontSize: 17,
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
