import {Icon} from "@rneui/base";
import {Image} from "expo-image";
import {Duration} from "luxon";
import React, {useCallback} from "react";
import {
  FlatList,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";

import VideoTouchable from "@/components/general/VideoTouchable";
import {useAppStyle} from "@/context/AppStyleContext";
import {useShelfVideoSelector} from "@/context/ShelfVideoSelector";
import {YTChapter} from "@/extraction/Types";

interface VideoChapterListProps {
  chapters: YTChapter[];
  width?: number;
  onPress?: (chapter: YTChapter) => void;
  containerStyle?: StyleProp<ViewStyle>;
}

export function VideoChapterList({
  chapters,
  onPress,
  width,
  containerStyle,
}: VideoChapterListProps) {
  const renderItem = useCallback(
    ({item}: {item: YTChapter}) => {
      return (
        <ChapterCard
          chapter={item}
          width={width}
          style={{marginHorizontal: 10}}
          onPress={() => onPress?.(item)}
        />
      );
    },
    [width],
  );

  const keyExtractor = useCallback((item: YTChapter) => {
    return item.title;
  }, []);

  return (
    <>
      <View style={styles.bottomTextContainer}>
        <Icon name={"book"} color={"white"} />
        <Text style={styles.bottomText}>{"Chapters"}</Text>
      </View>
      <FlatList
        horizontal
        data={chapters}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        onEndReachedThreshold={0.7}
        contentContainerStyle={[containerStyle]}
        // style={{marginBottom: 20}}
      />
    </>
  );
}

function ChapterCard({
  chapter,
  style,
  width,
  onPress,
}: {
  chapter: YTChapter;
  style?: StyleProp<ViewStyle>;
  width?: number;
  onPress?: () => void;
}) {
  const [focus, setFocus] = React.useState(false);
  const {style: appStyle} = useAppStyle();
  const {onElementFocused} = useShelfVideoSelector();

  return (
    <VideoTouchable
      style={[styles.container, style, {width: width ?? 500}]}
      onPress={onPress}
      onFocus={() => {
        setFocus(true);
        onElementFocused?.();
      }}
      onBlur={() => setFocus(false)}>
      <View
        style={[styles.segmentContainer, focus ? {borderColor: "white"} : {}]}>
        <Image
          style={[styles.imageStyle]}
          source={{
            uri: chapter.thumbnailImage.url,
          }}
        />
      </View>
      <Text style={[styles.titleStyle, {color: appStyle.textColor}]}>
        {chapter.title}
      </Text>
      <Text style={[{color: appStyle.textColor}]}>
        {secondsToReadableString(chapter.startDuration)}
      </Text>
    </VideoTouchable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 0,
  },
  segmentContainer: {
    backgroundColor: "#aaaaaa",
    borderRadius: 25,
    overflow: "hidden",
    borderWidth: 5,
    borderColor: "black",
    aspectRatio: 1.7,
  },
  bottomBorder: {
    position: "absolute",
    left: 0,
    bottom: 0,
    right: 0,
    height: "20%",
    backgroundColor: "#111111bb",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    paddingHorizontal: 15,
  },
  imageStyle: {
    width: "100%",
    height: "100%",
  },
  titleStyle: {
    fontSize: 25,
    width: "100%",
    flexShrink: 1,
  },
  bottomTextContainer: {
    flexDirection: "row",
    paddingStart: 20,
    paddingBottom: 15,
  },
  bottomText: {
    fontSize: 20,
    color: "white",
    paddingStart: 10,
  },
});

function secondsToReadableString(seconds: number) {
  const dur = Duration.fromObject({seconds});
  return dur.toFormat("mm:ss");
}
