import React, {useCallback} from "react";
import {FlatList, ListRenderItem, StyleProp, ViewStyle} from "react-native";

import {ElementCard} from "@/components/elements/phone/ElementCard";
import {HorizontalSection} from "@/components/grid/HorizontalSection";
import PageSectionList from "@/components/segments/PageSectionList";
import {HorizontalData} from "@/extraction/ShelfExtraction";
import {ElementData} from "@/extraction/Types";

interface GridFeedPhoneProps {
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  items: (ElementData | HorizontalData)[];
  onEndReached?: () => void;
}

export function GridFeedPhone({items, onEndReached}: GridFeedPhoneProps) {
  const renderItem = useCallback<ListRenderItem<ElementData | HorizontalData>>(
    ({item}) => {
      if ("data" in item) {
        return (
          <HorizontalSection
            headerText={item.title}
            content={item as HorizontalData}
            // horizontalListSegmentStyle={props.horizontalListSegmentStyle}
          />
        );
      }
      return (
        // <View style={{height: 50, width: 200, backgroundColor: "yellow"}} />
        // <VideoSegment
        //   element={item.item as ElementData}
        //   // textStyle={textStyle}
        //   style={{
        //     maxWidth: 100,
        //     marginHorizontal: 5,
        //   }}
        // />
        <ElementCard element={item as ElementData} width={"100%"} />
      );
    },
    [],
  );

  return (
    <FlatList
      data={items}
      renderItem={renderItem}
      onEndReached={onEndReached}
    />
  );
}
