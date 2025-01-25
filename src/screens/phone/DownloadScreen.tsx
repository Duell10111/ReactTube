import {CompositeScreenProps} from "@react-navigation/native";
import {NativeStackScreenProps} from "@react-navigation/native-stack";
import {Icon} from "@rneui/base";
import React, {useCallback, useEffect} from "react";
import {FlatList, ListRenderItem} from "react-native";

import {DownloadListItem} from "@/components/downloader/DownloadListItem";
import {useDownloadedVideos} from "@/downloader/DBData";
import {ElementData} from "@/extraction/Types";
import {RootBottomTabParamList} from "@/navigation/BottomTabBarNavigator";
import {RootStackParamList} from "@/navigation/RootStackNavigator";

type Props = CompositeScreenProps<
  NativeStackScreenProps<RootStackParamList, "Home">,
  NativeStackScreenProps<RootBottomTabParamList, "Download">
>;

export function DownloadScreen({navigation}: Props) {
  const videos = useDownloadedVideos();

  console.log(videos);

  useEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <Icon
          name={"history"}
          onPress={() => navigation.navigate("ActiveUploadScreen")}
          color={"white"}
          style={{marginStart: 10}}
        />
      ),
      headerRight: () => (
        <Icon
          name={"history"}
          onPress={() => navigation.navigate("ActiveDownloadScreen")}
          color={"white"}
          style={{marginEnd: 10}}
        />
      ),
    });
  }, []);

  const renderItem = useCallback<ListRenderItem<ElementData>>(({item}) => {
    return <DownloadListItem data={item} />;
  }, []);

  return <FlatList data={videos} renderItem={renderItem} />;
}
