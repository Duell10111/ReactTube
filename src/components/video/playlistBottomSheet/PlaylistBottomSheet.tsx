import React, {forwardRef, useCallback, useMemo} from "react";
import BottomSheet, {BottomSheetFlatList} from "@gorhom/bottom-sheet";
import {ElementData, YTVideoInfo} from "../../../extraction/Types";
import {StyleSheet} from "react-native";
import VideoSegment from "../../VideoSegment";
import {useAppStyle} from "../../../context/AppStyleContext";

interface Props {
  ytInfoPlaylist: Required<YTVideoInfo>["playlist"];
}

const PlaylistBottomSheet = forwardRef<BottomSheet, Props>(
  ({ytInfoPlaylist}, ref) => {
    const {style} = useAppStyle();

    // Workaround for crash with only 100% index
    const snapPoints = useMemo(() => ["100%"], []);
    console.log(ytInfoPlaylist);

    const renderItem = useCallback(
      ({item}: {item: ElementData}) => <VideoSegment element={item} />,
      [],
    );

    const keyExtractor = useCallback((item: ElementData) => item.id, []);

    return (
      <BottomSheet
        ref={ref}
        enablePanDownToClose
        snapPoints={snapPoints}
        index={-1}
        backgroundStyle={{backgroundColor: "grey"}}>
        <BottomSheetFlatList
          data={ytInfoPlaylist.content}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={[styles.contentContainer]}
          initialScrollIndex={ytInfoPlaylist.current_index}
        />
      </BottomSheet>
    );
  },
);

const styles = StyleSheet.create({
  contentContainer: {},
});

export default PlaylistBottomSheet;
