import _ from "lodash";
import React, {useCallback, useMemo} from "react";
import {FlatList, ListRenderItem, StyleSheet, Text, View} from "react-native";

import {HorizontalListItem} from "./HorizontalListItem";
import {useAppStyle} from "../../../context/AppStyleContext";
import {HorizontalData} from "../../../extraction/ShelfExtraction";
import {ElementData} from "../../../extraction/Types";

interface MusicHorizontalColumnShelfProps {
  data: HorizontalData;
  itemRows: number;
}

export function MusicHorizontalNRowShelf({
  data,
  itemRows,
}: MusicHorizontalColumnShelfProps) {
  const {style} = useAppStyle();

  const renderItem = useCallback<ListRenderItem<ElementData>>(({item}) => {
    return (
      <HorizontalListItem key={item?.id} data={item} />
      // <VideoSegment
      //   element={item}
      //   // textStyle={textStyle}
      //   style={{maxWidth: 100, marginHorizontal: 5}}
      // />
    );
  }, []);

  return (
    <View style={styles.containerStyle}>
      <Text style={[styles.textStyle, {color: style.textColor}]}>
        {`${data.title} - ${data.originalNode.type} - ${data.items_per_columns}`}
      </Text>
      <NGrid
        numRows={itemRows}
        data={data.parsedData}
        renderData={renderItem}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  containerStyle: {
    // backgroundColor: "blue",
    paddingBottom: 10,
  },
  textStyle: {
    fontSize: 25,
    paddingBottom: 10,
  },
});

interface NGridProps {
  numRows: number;
  data: ElementData[];
  renderData: ListRenderItem<ElementData>;
}

function NGrid({data, numRows, renderData}: NGridProps) {
  const columnData = useMemo(() => {
    return _.chain(data).chunk(numRows).value();
  }, [data, numRows]);

  const renderColumn = useCallback<ListRenderItem<ElementData[]>>(({item}) => {
    return (
      <View style={{rowGap: 2}}>
        {item.map((itemData, index) =>
          // @ts-ignore
          renderData({item: itemData, index, separators: null}),
        )}
      </View>
    );
  }, []);

  return <FlatList data={columnData} renderItem={renderColumn} horizontal />;
}
