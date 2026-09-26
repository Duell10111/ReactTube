import {BottomSheetFlatList} from "@gorhom/bottom-sheet";
import React, {useCallback} from "react";
import {ListRenderItem} from "react-native";

import {PlaylistManagerListItem} from "@/components/playlists/PlaylistManagerListItem";
import {ElementData} from "@/extraction/Types";
import {useTranslation} from "@/localization";
import {AppText} from "@/ui/components";
import {useAppTheme} from "@/ui/theme";

interface PlaylistManagerListProps {
  data: ElementData[];
  onPress?: (data: ElementData) => void;
}

/** Room for the floating "add playlist" footer of the sheet. */
const footerClearance = 100;

/**
 * The sheet's playlist list. `BottomSheetFlatList`, not `FlatList`: a plain
 * list loses the scroll gesture to the sheet's own pan handler, which pulled
 * the list back to the top on every swipe.
 */
export function PlaylistManagerList({data, onPress}: PlaylistManagerListProps) {
  const {t} = useTranslation();
  const {theme} = useAppTheme();
  const renderItem = useCallback<ListRenderItem<ElementData>>(
    ({item}) => (
      <PlaylistManagerListItem data={item} onPress={() => onPress?.(item)} />
    ),
    [onPress],
  );

  return (
    <BottomSheetFlatList
      ListHeaderComponent={
        <AppText
          style={{marginBottom: theme.spacing.sm}}
          variant={"titleMedium"}>
          {t("playlist.manager.saveTo")}
        </AppText>
      }
      contentContainerStyle={{
        paddingHorizontal: theme.spacing.md,
        paddingBottom: footerClearance,
      }}
      data={data}
      keyExtractor={item => item.id}
      renderItem={renderItem}
    />
  );
}
