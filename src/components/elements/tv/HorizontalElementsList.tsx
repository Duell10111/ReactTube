import React, {useCallback} from "react";
import {
  FlatList,
  ListRenderItem,
  Platform,
  StyleProp,
  TextStyle,
  ViewStyle,
} from "react-native";

import {ElementCard} from "@/components/elements/phone/ElementCard";
import {ElementCard as ElementCardTV} from "@/components/elements/tv/ElementCard";
import {ElementData} from "@/extraction/Types";
import Logger from "@/utils/Logger";

const LOGGER = Logger.extend("SEGMENT");

interface HorizontalElementsListProps {
  videoSegmentStyle?: StyleProp<ViewStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  width?: ViewStyle["width"];
  elements: ElementData[];
  onEndReached?: () => void;
}

export function HorizontalElementsList({
  elements,
  videoSegmentStyle,
  textStyle,
  onEndReached,
  containerStyle,
  width,
}: HorizontalElementsListProps) {
  const renderItem = useCallback<ListRenderItem<ElementData>>(
    ({item}: {item: ElementData}) => {
      // TODO: Remove isTV workaround once GridView not used anymore on Phone/Tablets?
      if (Platform.isTV) {
        return (
          <ElementCardTV
            element={item}
            // textStyle={textStyle}
            style={[videoSegmentStyle, {marginHorizontal: 10}]}
            width={width}
          />
        );
      } else {
        return (
          <ElementCard
            element={item}
            // textStyle={textStyle}
            style={[videoSegmentStyle, {marginHorizontal: 10}]}
            width={300}
          />
        );
      }
    },
    [textStyle, videoSegmentStyle],
  );

  // Adding index as sometimes a video occurs multiple times in a playlist for example
  const keyExtractor = useCallback((item: ElementData, index: number) => {
    return item.id + item.originalNode.type + index;
  }, []);

  return (
    <FlatList
      style={{alignSelf: "flex-start"}}
      contentContainerStyle={[{alignItems: "flex-start"}, containerStyle]}
      horizontal
      data={elements}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.8}
    />
  );
}
