import React, {useCallback} from "react";
import {
  FlatList,
  FlatListProps,
  ListRenderItem,
  StyleProp,
  TextStyle,
  ViewStyle,
} from "react-native";

import {LibraryElementCard} from "@/components/library/LibraryElementCard";
import {ElementData} from "@/extraction/Types";
import Logger from "@/utils/Logger";

const LOGGER = Logger.extend("SEGMENT");

interface HorizontalElementsListProps {
  videoSegmentStyle?: StyleProp<ViewStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  elements: ElementData[];
  onEndReached?: () => void;
  width?: number;
  endElement?: FlatListProps<ElementData>["ListFooterComponent"];
}

export function HorizontalElementsList({
  elements,
  videoSegmentStyle,
  textStyle,
  onEndReached,
  containerStyle,
  width,
  endElement,
}: HorizontalElementsListProps) {
  const renderItem = useCallback<ListRenderItem<ElementData>>(
    ({item}: {item: ElementData}) => {
      return (
        <LibraryElementCard
          element={item}
          // textStyle={textStyle}
          style={[videoSegmentStyle, {marginHorizontal: 10, width}]}
          width={width}
        />
      );
    },
    [textStyle, videoSegmentStyle, width],
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
      ListFooterComponent={endElement}
    />
  );
}
