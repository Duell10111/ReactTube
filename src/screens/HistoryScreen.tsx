import React from "react";
import {Text, View} from "react-native";
import HomeShelf from "../components/HomeShelf";
import useHistory from "../hooks/useHistory";

export default function HistoryScreen() {
  const {content, fetchMore} = useHistory();

  return (
    <View>
      <Text>History</Text>
      <HomeShelf
        shelfItem={content}
        onEndReached={() => fetchMore().catch(console.warn)}
      />
    </View>
  );
}
