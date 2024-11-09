import React, {useCallback, useMemo} from "react";
import {ListRenderItem, StyleProp, ViewStyle} from "react-native";
import {FlatGrid} from "react-native-super-grid";

import {ElementCard} from "@/components/elements/phone/ElementCard";
import {HorizontalSection} from "@/components/grid/HorizontalSection";
import PageSectionList from "@/components/segments/PageSectionList";
import {HorizontalData} from "@/extraction/ShelfExtraction";
import {ElementData} from "@/extraction/Types";

interface GridFeedViewProps {
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  items: (ElementData | HorizontalData)[];
  onEndReached?: () => void;
  itemDimension?: number;
}

interface GridDataItem {
  item: ElementData | HorizontalData;
  _fullWidth: boolean;
}

export default function GridFeedViewPhone({
  style,
  contentContainerStyle,
  items,
  onEndReached,
  itemDimension,
}: GridFeedViewProps) {
  const itemWidth = itemDimension ?? 200;

  const data = useMemo(
    () =>
      items.map(item => {
        const fullWidth = isHorizontalData(item);
        return {
          item,
          _fullWidth: fullWidth,
        } as GridDataItem;
      }),
    [items],
  );

  const renderItem = useCallback<ListRenderItem<GridDataItem>>(({item}) => {
    if (item._fullWidth && "data" in item.item) {
      return (
        <HorizontalSection
          headerText={item.item.title}
          content={item.item as HorizontalData}
          // horizontalListSegmentStyle={props.horizontalListSegmentStyle}
        />
      );
    }
    // return null;
    return <ElementCard element={item.item as ElementData} width={itemWidth} />;
  }, []);

  return (
    <FlatGrid
      style={[{height: "100%"}, style]}
      // Maybe add alignItems: "center"
      contentContainerStyle={[contentContainerStyle]}
      itemContainerStyle={{
        // backgroundColor: "yellow",
        alignItems: "center",
        justifyContent: "flex-start",
      }}
      data={data}
      renderItem={renderItem}
      itemDimension={itemWidth}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
    />
  );
}

function isHorizontalData(
  item: ElementData | HorizontalData,
): item is HorizontalData {
  return (item as HorizontalData).data !== undefined;
}
