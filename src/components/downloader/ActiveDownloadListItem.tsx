import {useEffect, useState} from "react";
import {DeviceEventEmitter, StyleSheet, Text, View} from "react-native";
import {ProgressBar} from "react-native-paper";

import {useAppStyle} from "@/context/AppStyleContext";
import {
  DownloadObject,
  getVideoDownloadEventUpdate,
} from "@/hooks/downloader/useDownloadProcessor";

interface Props {
  download: DownloadObject;
}

export default function ActiveDownloadListItem({download}: Props) {
  const {style} = useAppStyle();

  const [process, setProcess] = useState(download.process);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(
      getVideoDownloadEventUpdate(download.id),
      (p: number) => {
        setProcess(p);
      },
    );
    return () => {
      sub.remove();
    };
  }, []);

  return (
    <>
      <View style={styles.container}>
        <View style={styles.textContainer}>
          <Text style={{color: style.textColor}}>{download.id}</Text>
          {/*<Text*/}
          {/*  style={{*/}
          {/*    color: style.textColor,*/}
          {/*  }}>{`${author} - ${data.originalNode.type}`}</Text>*/}
        </View>
        {/* TODO: Add option to cancel downloads?*/}
        {/*{data.type === "video" && data.originalNode.type === "Local" ? (*/}
        {/*  <Menu*/}
        {/*    visible={showMenu}*/}
        {/*    onDismiss={() => setShowMenu(false)}*/}
        {/*    anchor={*/}
        {/*      <IconButton*/}
        {/*        icon={"dots-vertical"}*/}
        {/*        iconColor={"white"}*/}
        {/*        size={20}*/}
        {/*        onPress={() => setShowMenu(true)}*/}
        {/*      />*/}
        {/*    }>*/}
        {/*    <Menu.Item*/}
        {/*      onPress={() => {*/}
        {/*        setShowMenu(false);*/}
        {/*        uploadToWatch(data.id);*/}
        {/*      }}*/}
        {/*      title={"Upload"}*/}
        {/*      leadingIcon={"upload"}*/}
        {/*    />*/}
        {/*    <Menu.Item*/}
        {/*      onPress={() => {*/}
        {/*        setShowMenu(false);*/}
        {/*        deleteVideo(data.id).catch(console.warn);*/}
        {/*      }}*/}
        {/*      title={"Remove"}*/}
        {/*      leadingIcon={"delete"}*/}
        {/*    />*/}
        {/*  </Menu>*/}
        {/*) : null}*/}
      </View>
      <ProgressBar animatedValue={process} color={"blue"} />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    height: 50,
  },
  imageStyle: {
    borderRadius: 5,
    width: 50,
    height: 50,
  },
  textContainer: {
    justifyContent: "center",
    flex: 1,
    marginLeft: 15,
  },
  titleStyle: {
    fontSize: 20,
    fontWeight: "bold",
  },
});
