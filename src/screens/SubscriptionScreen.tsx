import React from "react";
import {View} from "react-native";

import GridFeedView from "@/components/grid/GridFeedView";
import ShelfVideoSelectorProvider from "@/context/ShelfVideoSelector";
import useSubscriptions from "@/hooks/tv/useSubscriptions";

export default function SubscriptionScreen() {
  const {data, fetchMore} = useSubscriptions();

  // TODO: Adapt for Phones in future again?

  return (
    <View>
      <ShelfVideoSelectorProvider>
        <GridFeedView items={data} onEndReached={fetchMore} />
      </ShelfVideoSelectorProvider>
    </View>
  );
}
