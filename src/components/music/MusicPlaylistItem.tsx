import {useNavigation} from "@react-navigation/native";
import {useState} from "react";
import {Image, StyleSheet, Text, TouchableOpacity, View} from "react-native";
import {IconButton, Menu, Icon} from "react-native-paper";

import {useAppStyle} from "@/context/AppStyleContext";
import {useDownloaderContext} from "@/context/DownloaderContext";
import {useMusikPlayerContext} from "@/context/MusicPlayerContext";
import {usePlaylistManagerContext} from "@/context/PlaylistManagerContext";
import {VideoData} from "@/extraction/Types";
import {RootNavProp} from "@/navigation/RootStackNavigator";

interface MusicPlaylistItemProps {
  data: VideoData;
  index: number;
  editable?: boolean;
  onDeleteItem?: () => void;
}

export function MusicPlaylistItem({
  data,
  index,
  editable,
  onDeleteItem,
}: MusicPlaylistItemProps) {
  const {style} = useAppStyle();
  const {navigate} = useNavigation<RootNavProp>();

  // console.log("NavEndpoint: ", JSON.stringify(data.navEndpoint));
  // const originalItem = data.originalNode.as(YTNodes.MusicResponsiveListItem);
  // console.log("ORG: ", originalItem.overlay.content.endpoint);

  const {setCurrentItem, addAsNextItem} = useMusikPlayerContext();
  const {save} = usePlaylistManagerContext();
  const {download} = useDownloaderContext();

  const [showMenu, setShowMenu] = useState(false);

  return (
    <TouchableOpacity
      onPress={() => {
        setCurrentItem(data);
        navigate("MusicPlayerScreen");
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
        {data.downloaded ? (
          <Icon source={"download"} color={"#34deeb"} size={22} />
        ) : null}
        <Menu
          visible={showMenu}
          onDismiss={() => setShowMenu(false)}
          anchor={
            // <Icon
            //   name={"dots-vertical"}
            //   type={"material-community"}
            //   color={"white"}
            //   size={16}
            //   onPress={() => setShowMenu(true)}
            // />
            <IconButton
              icon={"dots-vertical"}
              iconColor={"white"}
              size={20}
              onPress={() => setShowMenu(true)}
              // disabled={!editable}
            />
          }>
          {editable ? (
            <Menu.Item
              onPress={() => {
                setShowMenu(false);
                onDeleteItem?.();
              }}
              title={"Remove"}
              leadingIcon={"delete"}
            />
          ) : null}
          <Menu.Item
            onPress={() => {
              setShowMenu(false);
              save([data.id]);
            }}
            title={"Add to Playlist"}
            leadingIcon={"playlist-plus"}
          />
          <Menu.Item
            onPress={() => {
              setShowMenu(false);
              addAsNextItem(data);
            }}
            title={"Add as next item"}
            leadingIcon={"playlist-play"}
          />
          <Menu.Item
            onPress={() => {
              setShowMenu(false);
              download(data.id);
            }}
            title={"Download"}
            leadingIcon={"download"}
          />
        </Menu>
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
