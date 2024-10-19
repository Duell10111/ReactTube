import {useCallback} from "react";
import {FlatList, ListRenderItem, StyleSheet, View} from "react-native";
import {SafeAreaView} from "react-native-safe-area-context";

import {MusicBottomPlayerBar} from "@/components/music/MusicBottomPlayerBar";
import {MusicSearchFilterHeader} from "@/components/music/MusicSearchFilterHeader";
import {MusicSearchListItem} from "@/components/music/MusicSearchListItem";
import {ElementData, YTChipCloud, YTChipCloudChip} from "@/extraction/Types";

interface MusicSearchDetailsListProps {
  data: ElementData[];
  header: YTChipCloud;
  onFetchMore?: () => void;
  onClose?: () => void;
  onClick?: (chip: YTChipCloudChip) => void;
}

export function MusicSearchDetailsList({
  data,
  header,
  onFetchMore,
  onClose,
  onClick,
}: MusicSearchDetailsListProps) {
  const renderItem = useCallback<ListRenderItem<ElementData>>(
    ({item}) => <MusicSearchListItem data={item} />,
    [],
  );

  return (
    <View style={{flex: 1, paddingTop: 100}}>
      <FlatList
        data={data}
        renderItem={renderItem}
        contentInsetAdjustmentBehavior={"automatic"}
        onEndReached={onFetchMore}
        ListHeaderComponent={
          <MusicSearchFilterHeader
            data={header}
            closeable
            onClose={onClose}
            onClick={onClick}
          />
        }
      />
      {/*<MusicBottomPlayerBar />*/}
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: "row",
  },
});
