import BottomSheet, {BottomSheetFlatList} from "@gorhom/bottom-sheet";
import React, {forwardRef, useCallback, useMemo} from "react";
import {StyleProp, StyleSheet, Text, ViewStyle} from "react-native";

import {ElementCard} from "@/components/elements/phone/ElementCard";
import {useAppStyle} from "@/context/AppStyleContext";
import {ElementData, YTVideoInfo} from "@/extraction/Types";

interface Props {
  ytInfoPlaylist: Required<YTVideoInfo>["playlist"];
  flatListContentContainerStyle?: StyleProp<ViewStyle>;
}

const PlaylistBottomSheet = forwardRef<BottomSheet, Props>(
  ({ytInfoPlaylist, flatListContentContainerStyle}, ref) => {
    const {style} = useAppStyle();

    // Workaround for crash with only 100% index
    const snapPoints = useMemo(() => ["100%"], []);
    console.log(ytInfoPlaylist);

    const renderItem = useCallback(
      ({item, index}: {item: ElementData; index: number}) => (
        <ElementCard
          element={item}
          style={
            index === ytInfoPlaylist.current_index
              ? styles.selectedItem
              : undefined
          }
        />
      ),
      [ytInfoPlaylist.current_index],
    );

    const keyExtractor = useCallback((item: ElementData) => item.id, []);

    console.log("ScrollIndex: ", ytInfoPlaylist.current_index);

    return (
      <BottomSheet
        ref={ref}
        enablePanDownToClose
        snapPoints={snapPoints}
        index={-1}
        backgroundStyle={styles.backgroundSheet}>
        <Text style={[styles.headerTitle, {color: style.textColor}]}>
          {ytInfoPlaylist.title}
        </Text>
        <BottomSheetFlatList
          style={styles.bottomSheet}
          data={ytInfoPlaylist.content}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.contentContainer,
            flatListContentContainerStyle,
          ]}
          initialScrollIndex={ytInfoPlaylist.current_index}
          onScrollToIndexFailed={console.warn}
        />
      </BottomSheet>
    );
  },
);

const styles = StyleSheet.create({
  headerTitle: {
    fontSize: 15,
    textAlign: "center",
    marginBottom: 7,
  },
  backgroundSheet: {
    backgroundColor: "#444444",
  },
  bottomSheet: {
    height: "100%",
  },
  contentContainer: {},
  selectedItem: {
    opacity: 0.5,
  },
});

export default PlaylistBottomSheet;
