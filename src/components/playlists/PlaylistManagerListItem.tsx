import React, {useMemo} from "react";
import {Image, StyleSheet, Text, TouchableHighlight, View} from "react-native";

import {useAppStyle} from "@/context/AppStyleContext";
import {ElementData} from "@/extraction/Types";

interface PlaylistManagerListProps {
  data: ElementData;
  onPress?: () => void;
}

export function PlaylistManagerListItem({
  data,
  onPress,
}: PlaylistManagerListProps) {
  const {style} = useAppStyle();

  const author = useMemo(() => {
    return data.type === "video"
      ? (data.artists?.[0]?.name ?? data.author?.name)
      : data.author?.name;
  }, [data]);

  return (
    <TouchableHighlight onPress={onPress}>
      <View style={styles.container}>
        <Image
          style={styles.imageStyle}
          source={{uri: data.thumbnailImage.url}}
          resizeMode={"cover"}
        />
        <View style={styles.textContainer}>
          <Text style={{color: style.textColor}}>{data.title}</Text>
          <Text
            style={{
              color: style.textColor,
            }}>{`${author} - ${data.originalNode.type}`}</Text>
        </View>
      </View>
    </TouchableHighlight>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    // backgroundColor: "orange",
    width: 350,
    height: 50,
  },
  imageStyle: {
    aspectRatio: 1,
    borderRadius: 5,
  },
  textContainer: {
    marginLeft: 5,
    justifyContent: "center",
    flexShrink: 1,
  },
  titleStyle: {
    fontSize: 20,
    fontWeight: "bold",
  },
});
