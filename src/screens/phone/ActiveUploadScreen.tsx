import {useCallback} from "react";
import {FlatList, ListRenderItem, StyleSheet, Text, View} from "react-native";

import ActiveUploadListItem from "@/components/downloader/ActiveUploadListItem";
import {
  useDownloaderContext,
  WatchFileTransferInfo,
} from "@/context/DownloaderContext";

export function ActiveUploadScreen() {
  const {currentUploads} = useDownloaderContext();

  const renderItem = useCallback<ListRenderItem<WatchFileTransferInfo>>(
    ({item}) => {
      return <ActiveUploadListItem upload={item} />;
    },
    [],
  );

  console.log("Current Uploads: ", currentUploads);

  if (currentUploads.length === 0) {
    return (
      <View style={styles.noDownloadsContainer}>
        <Text style={styles.noDownloadsText}>{"No active uploads"}</Text>
      </View>
    );
  }

  return <FlatList data={currentUploads} renderItem={renderItem} />;
}

const styles = StyleSheet.create({
  noDownloadsContainer: {
    flex: 1,
    justifyContent: "center",
  },
  noDownloadsText: {
    color: "white",
    textAlign: "center",
    fontSize: 20,
  },
});
