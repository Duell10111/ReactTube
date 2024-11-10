import React, {useCallback} from "react";
import {FlatList, FlatListProps, StyleProp, TextStyle} from "react-native";

import {ElementCard} from "@/components/elements/phone/ElementCard";
import {ElementData} from "@/extraction/Types";

interface Props
  extends Omit<FlatListProps<ElementData>, "data" | "renderItem"> {
  textStyle?: StyleProp<TextStyle>;
  nodes: ElementData[];
  onEndReached?: () => void;
}

export default function VerticalVideoList({
  textStyle,
  nodes,
  onEndReached,
  ...props
}: Props) {
  const renderItem = useCallback(({item}: {item: ElementData}) => {
    return <ElementCard element={item} />;
  }, []);

  const keyExtractor = useCallback((item: ElementData) => {
    return item.id;
  }, []);

  return (
    <FlatList
      {...props}
      data={nodes}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.7}
    />
  );
}
