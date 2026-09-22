import {useNavigation} from "@react-navigation/native";
import {NativeStackScreenProps} from "@react-navigation/native-stack";
import {Image} from "expo-image";
import _ from "lodash";
import React, {useMemo} from "react";
import {StyleSheet, View} from "react-native";

import Logger from "../../utils/Logger";

import {VideoMenuContainer} from "@/components/general/VideoMenuContainer";
import {ElementData} from "@/extraction/Types";
import useElementData from "@/hooks/general/useElementData";
import usePlaylistManager from "@/hooks/playlist/usePlaylistManager";
import {useTranslation} from "@/localization";
import {RootStackParamList} from "@/navigation/RootStackNavigator";
import {NativeStackProp} from "@/navigation/types";
import {AppListItem, AppText} from "@/ui/components";
import {useAppTheme} from "@/ui/theme";

const LOGGER = Logger.extend("VIDEOMENU");

export function VideoMenuScreen({
  route,
}: NativeStackScreenProps<RootStackParamList, "VideoMenuContext">) {
  return (
    <VideoMenuContainer>
      <VideoMenuContent data={route.params.element} />
    </VideoMenuContainer>
  );
}

function VideoMenuContent({data: orgData}: {data: ElementData}) {
  const navigation = useNavigation<NativeStackProp>();
  const data = useElementData(orgData);
  const {executeNavEndpoint} = usePlaylistManager();
  const {t} = useTranslation();
  const {theme} = useAppTheme();

  const contextMenu = useMemo(() => {
    return "contextMenu" in data && data.contextMenu
      ? _.chain(data.contextMenu)
          .filter(
            c =>
              c.type !== "browse" &&
              c.type !== "watch" &&
              c.type !== "channel" &&
              c.type !== "feedback",
          )
          .value()
      : [];
  }, [data]);

  const channelID = useMemo(() => {
    const contextMenuChannelId =
      "contextMenu" in data
        ? data.contextMenu?.find(c => c.type === "channel")?.navEndpoint
            ?.payload.browseId
        : undefined;
    if (contextMenuChannelId) {
      return contextMenuChannelId;
    }

    return data.type === "video" || data.type === "reel"
      ? data?.author?.id
      : data.type === "channel"
        ? data.id
        : null;
  }, [data]);

  return (
    <>
      <View style={[styles.infoContainer, {gap: theme.spacing.sm}]}>
        <Image
          style={styles.infoImage}
          source={{
            uri: data?.thumbnailImage?.url,
          }}
          contentFit={"contain"}
        />
        <AppText variant={"titleMedium"}>{data?.title}</AppText>
        <AppText color={"textSecondary"}>{data?.author?.name}</AppText>
      </View>
      {channelID ? (
        <VideoMenuItem
          title={t("menu.channel")}
          onPress={() => {
            navigation.replace("ChannelScreen", {
              channelId: channelID,
            });
          }}
        />
      ) : null}
      {contextMenu.map((menu, index) => (
        <VideoMenuItem
          key={menu.text + index}
          title={menu.text}
          onPress={() => {
            if (menu.navEndpoint && menu.type !== "addToPlaylist") {
              executeNavEndpoint(menu.navEndpoint)
                .then(() => {
                  LOGGER.debug("Executed nav endpoint for menu", menu.type);
                  navigation.goBack();
                })
                .catch(LOGGER.warn);
            } else if (menu.type === "addToPlaylist") {
              navigation.replace("PlaylistManagerContextMenu", {
                videoId: data.id,
              });
            } else {
              LOGGER.warn("No supported type");
            }
          }}
        />
      ))}
    </>
  );
}

interface ItemProps {
  title: string;
  onPress: () => void;
}

function VideoMenuItem({title, onPress}: ItemProps) {
  return <AppListItem onPress={onPress} title={title} />;
}

const styles = StyleSheet.create({
  infoContainer: {
    alignSelf: "center",
    alignItems: "flex-start",
    justifyContent: "center",
    marginBottom: 10,
  },
  infoImage: {
    width: "100%",
    aspectRatio: 1.5,
    alignSelf: "center",
  },
});
