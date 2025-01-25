import {StyleSheet, Text, View} from "react-native";
import {ProgressBar} from "react-native-paper";

import {useAppStyle} from "@/context/AppStyleContext";
import {WatchFileTransferInfo} from "@/context/DownloaderContext";

interface Props {
  upload: WatchFileTransferInfo;
}

export default function ActiveUploadListItem({upload}: Props) {
  const {style} = useAppStyle();

  return (
    <>
      <View style={styles.container}>
        <View style={styles.textContainer}>
          <Text style={{color: style.textColor}}>
            {upload?.uri.split("/").reverse()?.[1]}
          </Text>
          {/*<Text*/}
          {/*  style={{*/}
          {/*    color: style.textColor,*/}
          {/*  }}>{`${author} - ${data.originalNode.type}`}</Text>*/}
        </View>
      </View>
      <ProgressBar animatedValue={upload.process} color={"blue"} />
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
