import {useNavigation} from "@react-navigation/native";
import {useState} from "react";
import {StyleSheet, View} from "react-native";
import {IconButton, Menu} from "react-native-paper";

import {useMusikPlayerContext} from "@/context/MusicPlayerContext";
import {ElementData} from "@/extraction/Types";
import usePlaylistManager from "@/hooks/playlist/usePlaylistManager";
import {useTranslation} from "@/localization";
import {RootNavProp} from "@/navigation/RootStackNavigator";
import {MediaRow} from "@/ui/patterns";
import {useAppTheme} from "@/ui/theme";

interface MusicLibraryListItemProps {
  data: ElementData;
}

export function MusicLibraryListItem({data}: MusicLibraryListItemProps) {
  const {setCurrentItem} = useMusikPlayerContext();
  const navigation = useNavigation<RootNavProp>();
  const [showMenu, setShowMenu] = useState(false);
  const {removePlaylistFromLibrary} = usePlaylistManager();
  const {t} = useTranslation();
  const {theme} = useAppTheme();

  const open = () => {
    if (data.type === "video") {
      setCurrentItem(data);
      navigation.navigate("MusicPlayerScreen");
    } else if (data.type === "playlist") {
      navigation.navigate("MusicPlaylistScreen", {playlistId: data.id});
    } else if (data.type === "album") {
      navigation.navigate("MusicAlbumScreen", {albumId: data.id});
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <MediaRow element={data} onPress={open} />
      </View>
      {data.type === "playlist" && data.originalNode.type === "Local" ? (
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
              removePlaylistFromLibrary(data.id).catch(console.warn);
            }}
            title={t("common.remove")}
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
