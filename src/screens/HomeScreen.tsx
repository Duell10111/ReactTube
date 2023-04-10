import React, {useCallback} from "react";
import {FlatList, Text, View} from "react-native";
import useHomeScreen from "../hooks/useHomeScreen";
import PageSegment from "../components/PageSegment";
// import {YTNodes, Helpers} from "../utils/Youtube";

export default function HomeScreen() {
  const {content} = useHomeScreen();

  const renderItem = useCallback(({item}) => <Text>test</Text>, []);

  // console.log(JSON.stringify(content?.contents, null, 4));
  if (true) {
    const array = content?.contents?.map(value => value);
    console.log(typeof array);
    return (
      <FlatList
        data={array ?? ["", ""]}
        renderItem={renderItem}
        contentContainerStyle={{backgroundColor: "lightblue"}}
      />
    );
  } else {
    console.log("Unknown type detected: ", JSON.stringify(content, null, 4));
    console.log(typeof content);
    return null;
  }
}
