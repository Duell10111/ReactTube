import {useNavigation} from "@react-navigation/native";
import {useState} from "react";
import {Image, StyleSheet, Text, TouchableOpacity, View} from "react-native";
import {IconButton, Menu} from "react-native-paper";

import {useAppStyle} from "@/context/AppStyleContext";
import {useDownloaderContext} from "@/context/DownloaderContext";
import {useMusikPlayerContext} from "@/context/MusicPlayerContext";
import {usePlaylistManagerContext} from "@/context/PlaylistManagerContext";
import {ElementData} from "@/extraction/Types";
import {RootNavProp} from "@/navigation/RootStackNavigator";

interface MusicSearchListItemProps {
  data: ElementData;
}

export function MusicSearchListItem({data}: MusicSearchListItemProps) {
  const {style} = useAppStyle();
  const {navigate, push} = useNavigation<RootNavProp>();

  const {setCurrentItem, addAsNextItem} = useMusikPlayerContext();
  const {save} = usePlaylistManagerContext();
  const {download} = useDownloaderContext();

  const [showMenu, setShowMenu] = useState(false);

  const onPress = () => {
    if (data.type === "video" || data.type === "mix") {
      setCurrentItem(data);
      navigate("MusicPlayerScreen");
    } else if (data.type === "playlist") {
      navigate("MusicPlaylistScreen", {
        playlistId: data.id,
      });
    } else if (data.type === "artist" || data.type === "channel") {
      push("MusicChannelScreen", {
        artistId: data.id,
      });
    } else if (data.type === "album") {
      push("MusicAlbumScreen", {
        albumId: data.id,
      });
    } else {
      console.warn(`Unknown type of MusicSearchListItem ${data.type}`);
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
        <Menu
          visible={showMenu}
          onDismiss={() => setShowMenu(false)}
          anchor={
            <IconButton
              icon={"dots-vertical"}
              iconColor={"white"}
              size={20}
              onPress={() => setShowMenu(true)}
            />
          }>
          {data.type === "video" ? (
            <>
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
                  download(data.id);
                }}
                title={"Download"}
                leadingIcon={"download"}
              />
              <Menu.Item
                onPress={() => {
                  setShowMenu(false);
                  addAsNextItem(data);
                }}
                title={"Add as next item"}
                leadingIcon={"playlist-play"}
              />
            </>
          ) : null}
          {data.author?.id ? (
            <Menu.Item
              onPress={() => {
                setShowMenu(false);
                push("MusicChannelScreen", {
                  artistId: data.author!.id,
                });
              }}
              title={"Go to author"}
              leadingIcon={"account-music"}
            />
          ) : null}
          {data.type === "video" && data.artists && data.artists.length > 0 ? (
            <Menu.Item
              onPress={() => {
                setShowMenu(false);
                push("MusicChannelScreen", {
                  artistId: data.artists![0].id,
                });
              }}
              title={"Go to author"}
              leadingIcon={"account-music"}
            />
          ) : null}
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
