import React from "react";
import {StyleSheet, Text, TouchableOpacity, View} from "react-native";
import {Icon} from "@rneui/base";
import {useAppStyle} from "../../../context/AppStyleContext";
import {YTVideoInfo} from "../../../extraction/Types";

interface Props {
  ytInfoPlaylist: Required<YTVideoInfo>["playlist"];
  onPress?: () => void;
}

export default function PlaylistBottomSheetContainer({
  ytInfoPlaylist,
  onPress,
}: Props) {
  const {style} = useAppStyle();

  // TODO: Add next video to UI
  return (
    <>
      <View
        style={{
          position: "absolute",
          left: 10,
          right: 10,
          bottom: 15,
        }}>
        <TouchableOpacity onPress={onPress}>
          <View style={styles.container}>
            <Icon
              name={"stream"}
              type={"material"}
              color={style.textColor}
              style={styles.iconStyle}
            />
            <Text style={{color: "white"}}>{ytInfoPlaylist?.title}</Text>
          </View>
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 25,
    backgroundColor: "grey",
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 5,
  },
  iconStyle: {
    marginHorizontal: 10,
  },
});
