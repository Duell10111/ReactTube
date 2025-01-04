import React, {useCallback} from "react";
import {
  FlatList,
  FlatListProps,
  Platform,
  StyleProp,
  View,
  ViewStyle,
} from "react-native";

import VideoSegment from "./VideoSegment";
import PageSectionList from "./segments/PageSectionList";
import ShelfVideoSelectorProvider from "../context/ShelfVideoSelector";
import useGrid from "../hooks/home/useGrid";
import {Helpers} from "../utils/Youtube";

interface Props extends Omit<FlatListProps<any>, "renderItem" | "data"> {
  style?: StyleProp<ViewStyle>;
  shelfItem: Helpers.YTNode[];
  columns?: number;
  onEndReached?: () => void;
  onElementFocused?: () => void;
  horizontalListSegmentStyle?: StyleProp<ViewStyle>;
}

export default function GridView({
  shelfItem,
  onEndReached,
  style,
  columns,
  onElementFocused,
  ...props
}: Props) {
  const sorted = useGrid(shelfItem, columns);

  const renderItem = useCallback(
    ({item}: {item: (typeof sorted)[number]}) => {
      if (Array.isArray(item)) {
        return (
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-around",
              alignItems: "flex-start",
            }}>
            {item.map((v, index) => (
              <VideoSegment key={`${v.id}-${index}`} element={v} />
            ))}
          </View>
        );
      }
      return (
        <PageSectionList
          headerText={item.title}
          content={item}
          horizontalListSegmentStyle={props.horizontalListSegmentStyle}
        />
      );
    },
    [props.horizontalListSegmentStyle],
  );
  const keyExtractor = useCallback(
    (item: (typeof sorted)[number], index: number) =>
      Array.isArray(item)
        ? `homeFeed-${item.map(v => v.id).join("#")}-${index}`
        : `homeFeed-${item.id}-${index}`,
    [],
  );

  return (
    <ShelfVideoSelectorProvider onElementFocused={onElementFocused}>
      <>
        <FlatList
          {...props}
          style={style}
          data={sorted}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={{
            padding: Platform.isTV ? 20 : 0,
          }}
          onEndReachedThreshold={0.7}
          onEndReached={onEndReached}
        />
      </>
    </ShelfVideoSelectorProvider>
  );
}
