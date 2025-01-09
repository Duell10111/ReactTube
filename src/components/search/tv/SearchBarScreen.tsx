import React, {useEffect} from "react";
import {TVEventControl, View} from "react-native";
import {RnNativeSearchBarView} from "rn-native-search-bar";

import GridFeedView from "@/components/grid/GridFeedView";
import {HorizontalData} from "@/extraction/ShelfExtraction";

interface SearchBarScreenProps {
  data: HorizontalData[];
  hints: string[];
  performSearch(text: string): void;
  fetchMore(): Promise<void>;
}

export function SearchBarScreen({
  hints,
  data,
  performSearch,
  fetchMore,
}: SearchBarScreenProps) {
  console.log("Data: ", data);

  useEffect(() => {
    TVEventControl.disableGestureHandlersCancelTouches();
    return () => TVEventControl.enableGestureHandlersCancelTouches();
  }, []);

  return (
    <View style={{flex: 1}}>
      <RnNativeSearchBarView
        style={{width: "100%", height: "100%", backgroundColor: "#555555"}}
        placeholder={"Search"}
        searchHints={hints}
        onSearchTextChanged={event => performSearch(event.nativeEvent.text)}
        onSearchButtonClicked={event => performSearch(event.nativeEvent.text)}
        onSearchTextEditEndedEvent={event => {
          console.log("SearchTextEdit Ended!");
          performSearch(event.nativeEvent.text);
        }}>
        <View style={{flex: 1}}>
          <GridFeedView
            items={data}
            onEndReached={() => fetchMore().catch(console.warn)}
          />
        </View>
      </RnNativeSearchBarView>
    </View>
  );
}
