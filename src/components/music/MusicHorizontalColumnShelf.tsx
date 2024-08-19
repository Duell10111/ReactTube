import React, {useCallback, useMemo} from "react";
import {ListRenderItem, Platform, StyleSheet, Text, View} from "react-native";
import {FlatGrid} from "react-native-super-grid";

import {useAppStyle} from "../../context/AppStyleContext";
import {HorizontalData} from "../../extraction/ShelfExtraction";
import {ElementData} from "../../extraction/Types";

interface MusicHorizontalColumnShelfProps {
  data: HorizontalData;
}

export function MusicHorizontalColumnShelf({
  data,
}: MusicHorizontalColumnShelfProps) {
  const {style} = useAppStyle();

  const renderItem = useCallback<ListRenderItem<ElementData>>(({item}) => {
    return (
      <View style={{height: 50, width: 200, backgroundColor: "yellow"}} />
      // <HorizontalListItem data={item} />
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
      <FlatGrid
        style={{backgroundColor: "red"}}
        data={data.parsedData}
        renderItem={renderItem}
        horizontal
        itemDimension={10}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  containerStyle: {
    marginVertical: 0,
    height: 400,
    backgroundColor: "blue",
  },
  textStyle: {
    fontSize: 25,
    paddingBottom: 10,
  },
});
