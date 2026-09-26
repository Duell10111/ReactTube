import {useNavigation} from "@react-navigation/native";
import {useState} from "react";
import {StyleSheet, View} from "react-native";
import {IconButton, Menu} from "react-native-paper";

import {useDownloaderContext} from "@/context/DownloaderContext";
import {useMusikPlayerContext} from "@/context/MusicPlayerContext";
import {deleteVideo} from "@/downloader/DBData";
import {ElementData} from "@/extraction/Types";
import {useTranslation} from "@/localization";
import {NativeStackProp} from "@/navigation/types";
import {MediaRow} from "@/ui/patterns";
import {useAppTheme} from "@/ui/theme";

interface DownloadListItemProps {
  data: ElementData;
}

export function DownloadListItem({data}: DownloadListItemProps) {
  const {uploadToWatch} = useDownloaderContext();
  const {setCurrentItem} = useMusikPlayerContext();
  const navigation = useNavigation<NativeStackProp>();
  const [showMenu, setShowMenu] = useState(false);
  const {theme} = useAppTheme();
  const {t} = useTranslation();

  const open = () => {
    if (data.type === "video") {
      setCurrentItem(data);
      navigation.navigate("MusicPlayerScreen");
    } else if (data.type === "playlist") {
      navigation.navigate("MusicPlaylistScreen", {playlistId: data.id});
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <MediaRow element={data} onPress={open} />
      </View>
      {data.type === "video" && data.originalNode.type === "Local" ? (
        <Menu
          visible={showMenu}
          onDismiss={() => setShowMenu(false)}
          anchor={
            <IconButton
              accessibilityLabel={t("media.moreOptions")}
              icon={"dots-vertical"}
              iconColor={theme.colors.textPrimary}
              size={24}
              onPress={() => setShowMenu(true)}
            />
          }>
          <Menu.Item
            onPress={() => {
              setShowMenu(false);
              uploadToWatch(data.id);
            }}
            title={t("downloads.upload")}
            leadingIcon={"upload"}
          />
          <Menu.Item
            onPress={() => {
              setShowMenu(false);
              deleteVideo(data.id).catch(console.warn);
            }}
            title={t("downloads.remove")}
            leadingIcon={"delete"}
          />
        </Menu>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
  },
  row: {
    flex: 1,
  },
});
