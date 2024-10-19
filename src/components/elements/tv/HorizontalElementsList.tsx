import React, {useCallback} from "react";
import {
  FlatList,
  ListRenderItem,
  Platform,
  StyleProp,
  TextStyle,
  ViewStyle,
} from "react-native";

import ChannelSegment from "@/components/ChannelSegment";
import {ElementCard} from "@/components/elements/phone/ElementCard";
import {ElementCard as ElementCardTV} from "@/components/elements/tv/ElementCard";
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
      if (item.type === "channel") {
        return <ChannelSegment element={item.originalNode} />;
      } else {
        // TODO: Remove isTV workaround once GridView not used anymore on Phone/Tablets?
        if (Platform.isTV) {
          return (
            <ElementCardTV
              element={item}
              // textStyle={textStyle}
              style={[videoSegmentStyle, {marginHorizontal: 10}]}
            />
          );
        } else {
          return (
            <ElementCard
              element={item}
              // textStyle={textStyle}
              style={[videoSegmentStyle, {marginHorizontal: 10}]}
            />
          );
        }
      }
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
