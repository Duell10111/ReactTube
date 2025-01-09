import {useNavigation} from "@react-navigation/native";
import {useMemo, useState} from "react";
import {Image, StyleSheet, Text, TouchableHighlight, View} from "react-native";
import {IconButton, Menu} from "react-native-paper";

import {useAppStyle} from "@/context/AppStyleContext";
import {useDownloaderContext} from "@/context/DownloaderContext";
import {useMusikPlayerContext} from "@/context/MusicPlayerContext";
import {deleteVideo} from "@/downloader/DBData";
import {ElementData} from "@/extraction/Types";
import {NativeStackProp} from "@/navigation/types";

interface DownloadListItemProps {
  data: ElementData;
}

export function DownloadListItem({data}: DownloadListItemProps) {
  const {uploadToWatch} = useDownloaderContext();
  const {style} = useAppStyle();
  const {setCurrentItem} = useMusikPlayerContext();
  const navigation = useNavigation<NativeStackProp>();
  const [showMenu, setShowMenu] = useState(false);

  const author = useMemo(() => {
    return data.type === "video"
      ? (data.artists?.[0]?.name ?? data.author?.name)
      : data.author?.name;
  }, [data]);

  return (
    <TouchableHighlight
      onPress={() => {
        // setPlaylistViaLocalDownload(data.id);
        // navigation.navigate("MusicPlayerScreen");
        if (data.type === "video") {
          setCurrentItem(data);
          navigation.navigate("MusicPlayerScreen");
        } else if (data.type === "playlist") {
          navigation.navigate("MusicPlaylistScreen", {playlistId: data.id});
        }
      }}>
      <View style={styles.container}>
        <Image
          style={styles.imageStyle}
          source={{uri: data.thumbnailImage.url}}
          resizeMode={"cover"}
        />
        <View style={styles.textContainer}>
          <Text style={{color: style.textColor}}>{data.title}</Text>
          <Text
            style={{
              color: style.textColor,
            }}>{`${author} - ${data.originalNode.type}`}</Text>
        </View>
        {data.type === "video" && data.originalNode.type === "Local" ? (
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
            <Menu.Item
              onPress={() => {
                setShowMenu(false);
                uploadToWatch(data.id);
              }}
              title={"Upload"}
              leadingIcon={"upload"}
            />
            <Menu.Item
              onPress={() => {
                setShowMenu(false);
                deleteVideo(data.id).catch(console.warn);
              }}
              title={"Remove"}
              leadingIcon={"delete"}
            />
          </Menu>
        ) : null}
      </View>
    </TouchableHighlight>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
  },
  imageStyle: {
    borderRadius: 5,
    width: 50,
    height: 50,
  },
  textContainer: {
    justifyContent: "center",
    flex: 1,
    marginLeft: 15,
  },
  titleStyle: {
    fontSize: 20,
    fontWeight: "bold",
  },
});
