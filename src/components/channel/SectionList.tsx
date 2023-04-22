import React, {useCallback} from "react";
import {Helpers, YTNodes} from "../../utils/Youtube";
import {FlatList, StyleProp, ViewStyle} from "react-native";
import PageSegment from "../PageSegment";
import {itemSectionExtractor} from "../../utils/YTNodeKeyExtractor";

interface Props {
  style?: StyleProp<ViewStyle>;
  node: Helpers.YTNode | Helpers.YTNode[];
}

export default function SectionList({node, style}: Props) {
  if (Array.isArray(node)) {
    return <ItemList nodes={node} />;
  } else if (node.is(YTNodes.SectionList)) {
    console.log("Cont: ", node.continuation);
    return <ItemList nodes={node.contents} />;
  } else {
    console.log("Unsupported SectionList type: ", node.type);
    return null;
  }
}

interface ListProps {
  style?: StyleProp<ViewStyle>;
  nodes: Helpers.YTNode[];
}

function ItemList({nodes, style}: ListProps) {
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
    />
  );
}
