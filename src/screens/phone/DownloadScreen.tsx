import {CompositeScreenProps} from "@react-navigation/native";
import {NativeStackScreenProps} from "@react-navigation/native-stack";
import React, {useCallback, useEffect} from "react";
import {FlatList, ListRenderItem} from "react-native";

import {DownloadListItem} from "@/components/downloader/DownloadListItem";
import {useDownloadedVideos} from "@/downloader/DBData";
import {ElementData} from "@/extraction/Types";
import {useTranslation} from "@/localization";
import {RootBottomTabParamList} from "@/navigation/BottomTabBarNavigator";
import {RootStackParamList} from "@/navigation/RootStackNavigator";
import {AppIconButton, EmptyState} from "@/ui/components";
import {useAppTheme} from "@/ui/theme";

type Props = CompositeScreenProps<
  NativeStackScreenProps<RootStackParamList, "Home">,
  NativeStackScreenProps<RootBottomTabParamList, "Download">
>;

export function DownloadScreen({navigation}: Props) {
  const videos = useDownloadedVideos();
  const {t} = useTranslation();
  const {theme} = useAppTheme();

  useEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <AppIconButton
          accessibilityLabel={t("uploads.activeAction")}
          icon={"upload"}
          onPress={() => navigation.navigate("ActiveUploadScreen")}
        />
      ),
      headerRight: () => (
        <AppIconButton
          accessibilityLabel={t("downloads.activeAction")}
          icon={"downloading"}
          onPress={() => navigation.navigate("ActiveDownloadScreen")}
        />
      ),
    });
  }, [navigation, t]);

  const renderItem = useCallback<ListRenderItem<ElementData>>(({item}) => {
    return <DownloadListItem data={item} />;
  }, []);

  return (
    <FlatList
      ListEmptyComponent={
        <EmptyState
          message={t("downloads.empty.message")}
          title={t("downloads.empty.title")}
        />
      }
      contentContainerStyle={{
        flexGrow: 1,
        gap: theme.spacing.xs,
        padding: theme.spacing.md,
      }}
      data={videos}
      renderItem={renderItem}
    />
  );
}
