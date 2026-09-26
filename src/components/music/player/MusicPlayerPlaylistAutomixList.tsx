import {useCallback} from "react";
import {FlatList, ListRenderItem, StyleSheet, View} from "react-native";
import {Switch} from "react-native-paper";

import {MusicPlayerPlaylistListItem} from "@/components/music/player/MusicPlayerPlaylistListItem";
import {useMusikPlayerContext} from "@/context/MusicPlayerContext";
import {YTPlaylistPanelItem} from "@/extraction/Types";
import {useTranslation} from "@/localization";
import {AppText, Divider} from "@/ui/components";
import {useAppTheme} from "@/ui/theme";

export function MusicPlayerPlaylistAutomixList() {
  const {automix, setAutomix, automixPlaylist, setCurrentItem} =
    useMusikPlayerContext();
  const {t} = useTranslation();
  const {theme} = useAppTheme();

  const renderItem = useCallback<ListRenderItem<YTPlaylistPanelItem>>(
    ({item, index}) => (
      <MusicPlayerPlaylistListItem
        data={item}
        onPress={() => {
          setCurrentItem(item, false, true);
        }}
      />
    ),
    [],
  );

  return (
    <View style={styles.container}>
      <Divider style={styles.divider} />
      <View
        style={[
          styles.buttonContainer,
          {gap: theme.spacing.md, padding: theme.spacing.md},
        ]}>
        <View style={styles.textContainer}>
          <AppText variant={"label"}>
            {t("music.autoplay", {
              state: t(automix ? "common.enabled" : "common.disabled"),
            })}
          </AppText>
          <AppText color={"textSecondary"} variant={"bodySmall"}>
            {t("music.autoplay.hint")}
          </AppText>
        </View>
        <Switch value={automix} onValueChange={amix => setAutomix(amix)} />
      </View>
      <FlatList
        data={automix ? (automixPlaylist?.items ?? []) : []}
        renderItem={renderItem}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
  },
  divider: {
    marginTop: 8,
  },
  buttonContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  textContainer: {
    flex: 1,
  },
});
