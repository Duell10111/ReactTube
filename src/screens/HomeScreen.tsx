import React, {useCallback} from "react";
import {FlatList, ScrollView} from "react-native";
import useHomeScreen from "../hooks/useHomeScreen";
import PageSegment from "../components/PageSegment";

export default function HomeScreen() {
  const {pageSegments} = useHomeScreen();

  const renderItem = useCallback(
    ({item, index}) => <PageSegment key={index} segment={item} />,
    [],
  );

  return (
    <FlatList
      data={pageSegments ?? []}
      renderItem={renderItem}
      numColumns={3}
      contentContainerStyle={{backgroundColor: "lightblue"}}
    />
  );
}
