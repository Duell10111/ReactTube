import React, {useCallback} from "react";
import {YTNodes, Helpers} from "../utils/Youtube";
import {FlatList, StyleSheet, Text, View} from "react-native";
import PageSegment from "./PageSegment";
import useHomeShelf from "../hooks/home/useHomeShelf";

interface Props {
  shelfItem: Helpers.YTNode[];
  onEndReached: () => void;
}

export default function HomeShelf({shelfItem, onEndReached}: Props) {
  const sorted = useHomeShelf(shelfItem);

  const renderItem = useCallback(({item}: {item: (typeof sorted)[number]}) => {
    if (Array.isArray(item)) {
      return (
        <View
          style={{
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center",
          }}>
          {item.map((v, index) => (
            <PageSegment key={`${v.type}-${index}`} segment={v} />
          ))}
        </View>
      );
    }
    return <PageSegment segment={item} />;
  }, []);
  const keyExtractor = useCallback(
    (item: (typeof sorted)[number], index: number) =>
      Array.isArray(item)
        ? `homeFeed-${item.map(v => v.type).join("#")}-${index}`
        : `homeFeed-${item.type}-${index}`,
    [],
  );

  return (
    <FlatList
      data={sorted}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      contentContainerStyle={{
        padding: 20,
        backgroundColor: "lightblue",
      }}
      onEndReachedThreshold={0.7}
      onEndReached={onEndReached}
    />
  );
}
