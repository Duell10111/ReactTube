import {Icon} from "@rneui/base";
import React from "react";
import {
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";

import {useAppStyle} from "@/context/AppStyleContext";
import {YTVideoInfo} from "@/extraction/Types";

interface Props {
  ytInfoPlaylist: Required<YTVideoInfo>["playlist"];
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export default function PlaylistBottomSheetContainer({
  ytInfoPlaylist,
  onPress,
  style: passedStyle,
}: Props) {
  const {style} = useAppStyle();

  // TODO: Add next video to UI
  return (
    <View
      style={[
        {
          position: "absolute",
          left: 10,
          right: 10,
          bottom: 15,
        },
        passedStyle,
      ]}>
      <TouchableOpacity onPress={onPress}>
        <View style={styles.container}>
          <Icon
            name={"stream"}
            type={"material"}
            color={style.textColor}
            style={styles.iconStyle}
          />
          <View>
            <Text style={{color: style.textColor}} numberOfLines={1}>
              {ytInfoPlaylist?.title}
            </Text>
            {ytInfoPlaylist.content[ytInfoPlaylist.current_index + 1] ? (
              <Text
                numberOfLines={1}
                style={[
                  styles.nextVideoText,
                  {color: style.textColor},
                ]}>{`Next Video: ${
                ytInfoPlaylist.content[ytInfoPlaylist.current_index + 1].title
              }`}</Text>
            ) : null}
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    backgroundColor: "#444444dd",
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 5,
    overflow: "hidden",
  },
  iconStyle: {
    marginHorizontal: 10,
  },
  nextVideoText: {
    fontSize: 12,
  },
});
