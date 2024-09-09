import React, {useCallback, useMemo} from "react";
import {ListRenderItem, View} from "react-native";
import {FlatGrid} from "react-native-super-grid";

import VideoSegment from "@/components/VideoSegment";
import PageSectionList from "@/components/segments/PageSectionList";
import {HorizontalData} from "@/extraction/ShelfExtraction";
import {ElementData} from "@/extraction/Types";

interface GridFeedViewProps {
  items: (ElementData | HorizontalData)[];
  onEndReached?: () => void;
}

interface GridDataItem {
  item: ElementData | HorizontalData;
  _fullWidth: boolean;
}

export default function GridFeedView({items, onEndReached}: GridFeedViewProps) {
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
    if (item._fullWidth && item.item.data) {
      // console.log("Items: ", item.item.parsedData);
      // console.log("Org Items: ", item.item.data);
      // console.log("Original: ", item.item.originalNode);
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
      <VideoSegment
        element={item.item as ElementData}
        // textStyle={textStyle}
        style={{maxWidth: 100, marginHorizontal: 5}}
      />
    );
  }, []);

  return (
    <FlatGrid
      style={{backgroundColor: "red"}}
      data={data}
      renderItem={renderItem}
      itemDimension={10}
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
