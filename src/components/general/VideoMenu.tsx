import {useNavigation} from "@react-navigation/native";
import {NativeStackScreenProps} from "@react-navigation/native-stack";
import {Image} from "expo-image";
import React from "react";
import {StyleSheet, View} from "react-native";

import {VideoMenuContainer} from "@/components/general/VideoMenuContainer";
import {ElementData} from "@/extraction/Types";
import useVideoMenuActions from "@/hooks/general/useVideoMenuActions";
import {useTranslation} from "@/localization";
import {RootStackParamList} from "@/navigation/RootStackNavigator";
import {NativeStackProp} from "@/navigation/types";
import {AppListItem, AppText} from "@/ui/components";
import {useAppTheme} from "@/ui/theme";

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
  const {data, entries, channelId, runEntry} = useVideoMenuActions(orgData);
  const {t} = useTranslation();
  const {theme} = useAppTheme();

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
      {channelId ? (
        <VideoMenuItem
          title={t("menu.channel")}
          onPress={() => {
            navigation.replace("ChannelScreen", {channelId});
          }}
        />
      ) : null}
      {entries.map((menu, index) => (
        <VideoMenuItem
          key={menu.text + index}
          title={menu.text}
          onPress={() =>
            runEntry(menu, {
              onDone: () => navigation.goBack(),
              onAddToPlaylist: videoId =>
                navigation.replace("PlaylistManagerContextMenu", {videoId}),
            })
          }
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
