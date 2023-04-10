import React, {useCallback} from "react";
import {FlatList, Text, View} from "react-native";
import useHomeScreen from "../hooks/useHomeScreen";
import PageSegment from "../components/PageSegment";
import {YTNodes, Helpers} from "../utils/Youtube";

export default function HomeScreen() {
  const {content} = useHomeScreen();

  const renderItem = useCallback(
    ({item}) => (
      <View style={{margin: 20}}>
        <PageSegment segment={item} />
      </View>
    ),
    [],
  );
  const keyExtractor = useCallback((item, index) => index, []);

  // console.log("Content: ", JSON.stringify(content, null, 4));
  if (!content) {
    return null;
  } else if (true) {
    const array = content?.contents?.map(value => value);
    console.log(typeof array);
    return (
      <FlatList
        data={array ?? ["", ""]}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={{
          backgroundColor: "lightblue",
          padding: 30,
          justifyContent: "center",
          alignItems: "center",
        }}
        numColumns={3}
      />
    );
  } else {
    console.log("Unknown type detected: ", JSON.stringify(content, null, 4));
    console.log(typeof content);
    return null;
  }
}
