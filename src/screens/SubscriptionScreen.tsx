import React from "react";
import {Platform, Text, View} from "react-native";

import GridView from "../components/GridView";
import useSubscriptions from "../hooks/useSubscriptions";

import GridFeedView from "@/components/grid/GridFeedView";

export default function SubscriptionScreen() {
  const {content, parsedContent, fetchMore} = useSubscriptions();

  console.log("Subs: ", parsedContent);

  // if (Platform.isTV) {
  //   return <GridFeedView items={parsedContent} />;
  // }

  return (
    <View>
      <Text>{"Subscription"}</Text>
      <GridView
        shelfItem={content}
        onEndReached={() => fetchMore().catch(console.warn)}
      />
    </View>
  );
}
