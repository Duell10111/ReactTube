import React from "react";
import {View} from "react-native";

import useSubscriptions from "../hooks/useSubscriptions";

import GridFeedView from "@/components/grid/GridFeedView";
import ShelfVideoSelectorProvider from "@/context/ShelfVideoSelector";

export default function SubscriptionScreen() {
  const {parsedContent, fetchMore} = useSubscriptions();

  // TODO: Adapt for Phones in future again?

  return (
    <View>
      <ShelfVideoSelectorProvider>
        <GridFeedView items={parsedContent} onEndReached={fetchMore} />
      </ShelfVideoSelectorProvider>
    </View>
  );
}
