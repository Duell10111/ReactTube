import {useCallback, useEffect, useState} from "react";
import {FlatList, ListRenderItem, StyleSheet, Text, View} from "react-native";

import ActiveDownloadListItem from "@/components/downloader/ActiveDownloadListItem";
import {useDownloaderContext} from "@/context/DownloaderContext";
import {DownloadObject} from "@/hooks/downloader/useDownloadProcessor";

export function ActiveDownloadScreen() {
  const {currentDownloads} = useDownloaderContext();
  const [activeDownloads, setActiveDownloads] = useState<DownloadObject[]>([]);

  useEffect(() => {
    setActiveDownloads(Object.values(currentDownloads.current));
    const interval = setInterval(() => {
      setActiveDownloads(Object.values(currentDownloads.current));
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const renderItem = useCallback<ListRenderItem<DownloadObject>>(({item}) => {
    return <ActiveDownloadListItem download={item} />;
  }, []);

  console.log(currentDownloads);
  console.log(activeDownloads);

  if (activeDownloads.length === 0) {
    return (
      <View style={styles.noDownloadsContainer}>
        <Text style={styles.noDownloadsText}>{"No active downloads"}</Text>
      </View>
    );
  }

  return <FlatList data={activeDownloads} renderItem={renderItem} />;
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
