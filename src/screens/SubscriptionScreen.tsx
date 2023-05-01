import React from "react";
import {Text, View} from "react-native";
import useSubscriptions from "../hooks/useSubscriptions";
import HomeShelf from "../components/HomeShelf";

export default function SubscriptionScreen() {
  const {content, fetchMore} = useSubscriptions();

  return (
    <View>
      <Text>Subscription</Text>
      <HomeShelf
        shelfItem={content}
        onEndReached={() => fetchMore().catch(console.warn)}
      />
    </View>
  );
}
