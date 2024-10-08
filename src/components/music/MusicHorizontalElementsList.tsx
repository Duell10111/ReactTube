import React, {useCallback} from "react";
import {
  FlatList,
  ListRenderItem,
  StyleProp,
  TextStyle,
  ViewStyle,
} from "react-native";

import {MusicElementCard} from "@/components/music/elements/MusicElementCard";
import {ElementData} from "@/extraction/Types";
import Logger from "@/utils/Logger";

const LOGGER = Logger.extend("SEGMENT");

interface MusicHorizontalElementsListProps {
  videoSegmentStyle?: StyleProp<ViewStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  elements: ElementData[];
  onEndReached?: () => void;
}

export function MusicHorizontalElementsList({
  elements,
  videoSegmentStyle,
  textStyle,
  onEndReached,
  containerStyle,
}: MusicHorizontalElementsListProps) {
  const renderItem = useCallback<ListRenderItem<ElementData>>(
    ({item}: {item: ElementData}) => {
      return (
        <MusicElementCard
          data={item}
          style={{width: 150, marginHorizontal: 7}}
        />
      );
    },
    [textStyle, videoSegmentStyle],
  );

  const keyExtractor = useCallback((item: ElementData) => {
    return item.id;
  }, []);

  return (
    <FlatList
      style={{alignSelf: "flex-start"}}
      contentContainerStyle={{alignItems: "flex-start"}}
      horizontal
      data={elements}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.7}
    />
  );
}
