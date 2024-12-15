import {CompositeScreenProps} from "@react-navigation/native";
import {NativeStackScreenProps} from "@react-navigation/native-stack";
import {Icon} from "@rneui/base";
import React, {useEffect} from "react";
import {ScrollView} from "react-native";

import {DownloadListItem} from "@/components/downloader/DownloadListItem";
import {useVideos} from "@/downloader/DownloadDatabaseOperations";
import {RootBottomTabParamList} from "@/navigation/BottomTabBarNavigator";
import {RootStackParamList} from "@/navigation/RootStackNavigator";

type Props = CompositeScreenProps<
  NativeStackScreenProps<RootStackParamList, "Home">,
  NativeStackScreenProps<RootBottomTabParamList, "Download">
>;

export function DownloadScreen({navigation}: Props) {
  const videos = useVideos();

  console.log(videos);

  useEffect(() => {
    navigation.setOptions({
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

  return (
    <ScrollView>
      {videos.map(v => (
        <DownloadListItem key={v.id} id={v.id} />
      ))}
    </ScrollView>
  );
}
