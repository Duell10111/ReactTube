import React, {useCallback} from "react";
import {
  FlatList,
  ListRenderItem,
  StyleProp,
  TextStyle,
  ViewStyle,
} from "react-native";

import {ElementCard} from "@/components/elements/phone/ElementCard";
import {ElementData} from "@/extraction/Types";
import Logger from "@/utils/Logger";

const LOGGER = Logger.extend("SEGMENT");

interface HorizontalElementsListProps {
  videoSegmentStyle?: StyleProp<ViewStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  elements: ElementData[];
  onEndReached?: () => void;
}

export function HorizontalElementsList({
  elements,
  videoSegmentStyle,
  textStyle,
  onEndReached,
  containerStyle,
}: HorizontalElementsListProps) {
  const renderItem = useCallback<ListRenderItem<ElementData>>(
    ({item}: {item: ElementData}) => {
      return (
        <ElementCard
          element={item}
          // textStyle={textStyle}
          style={[videoSegmentStyle, {marginHorizontal: 10, width: 200}]}
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
