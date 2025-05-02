import React from "react";

import LoadingComponent from "@/components/general/LoadingComponent";
import GridFeedView from "@/components/grid/GridFeedView";
import {SectionTitle} from "@/components/library/SectionTitle";
import ShelfVideoSelectorProvider from "@/context/ShelfVideoSelector";
import useHistory from "@/hooks/tv/useHistory";

export default function HistoryScreen() {
  const {data, fetchMore} = useHistory();

  if (!data) {
    return <LoadingComponent />;
  }

  return (
    <ShelfVideoSelectorProvider>
      <SectionTitle title={"History"} />
      <GridFeedView items={data} onEndReached={fetchMore} />
    </ShelfVideoSelectorProvider>
  );
}
