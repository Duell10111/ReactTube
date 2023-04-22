import React, {useCallback} from "react";
import {Helpers, YTNodes} from "../../utils/Youtube";
import {FlatList, StyleProp, ViewStyle} from "react-native";
import PageSegment from "../PageSegment";
import {itemSectionExtractor} from "../../utils/YTNodeKeyExtractor";

interface Props {
  style?: StyleProp<ViewStyle>;
  node: Helpers.YTNode | Helpers.YTNode[];
  onEndReached?: () => void;
}

export default function SectionList({node, ...otherProps}: Props) {
  if (Array.isArray(node)) {
    return <ItemList nodes={node} {...otherProps} />;
  } else if (node.is(YTNodes.SectionList)) {
    console.log("Cont: ", node.continuation);
    return <ItemList nodes={node.contents} {...otherProps} />;
  } else {
    console.log("Unsupported SectionList type: ", node.type);
    return null;
  }
}

interface ListProps {
  style?: StyleProp<ViewStyle>;
  nodes: Helpers.YTNode[];
  onEndReached?: () => void;
}

function ItemList({nodes, style, onEndReached}: ListProps) {
  const renderItem = useCallback(
    ({item}: {item: Helpers.YTNode}) => <PageSegment segment={item} />,
    [],
  );

  return (
    <FlatList
      style={{height: "100%"}}
      data={nodes}
      renderItem={renderItem}
      keyExtractor={item => itemSectionExtractor(item)}
      onEndReachedThreshold={0.7}
      onEndReached={onEndReached}
    />
  );
}
