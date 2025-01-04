import React, {useCallback, useMemo} from "react";
import {ListRenderItem, StyleProp, ViewStyle} from "react-native";
import {FlatGrid, FlatGridProps} from "react-native-super-grid";

import {ElementCard} from "@/components/elements/tv/ElementCard";
import PageSectionList from "@/components/segments/PageSectionList";
import {HorizontalData} from "@/extraction/ShelfExtraction";
import {ElementData} from "@/extraction/Types";

interface GridFeedViewProps {
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  items: (ElementData | HorizontalData)[];
  onEndReached?: () => void;
  ListHeaderComponent?: FlatGridProps["ListHeaderComponent"];
  ListFooterComponent?: FlatGridProps["ListFooterComponent"];
}

interface GridDataItem {
  item: ElementData | HorizontalData;
  _fullWidth: boolean;
}

export default function GridFeedView({
  style,
  contentContainerStyle,
  items,
  onEndReached,
  ListHeaderComponent,
  ListFooterComponent,
}: GridFeedViewProps) {
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
        <PageSectionList
          headerText={item.item.title}
          content={item.item as HorizontalData}
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
      <ElementCard element={item.item as ElementData} width={"100%"} />
    );
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
      itemDimension={500}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
      ListHeaderComponent={ListHeaderComponent}
      ListFooterComponent={ListFooterComponent}
    />
  );
}

function isHorizontalData(
  item: ElementData | HorizontalData,
): item is HorizontalData {
  return (item as HorizontalData).data !== undefined;
}
