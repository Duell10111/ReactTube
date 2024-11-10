import {useCallback} from "react";
import {FlatList, ListRenderItem} from "react-native";

import LoadingComponent from "@/components/general/LoadingComponent";
import {LibrarySectionItem} from "@/components/library/LibrarySectionItem";
import {YTLibrarySection} from "@/extraction/Types";
import useLibrary from "@/hooks/useLibrary";

export function LibraryScreenTV() {
  const {data} = useLibrary();

  const renderItem = useCallback<ListRenderItem<YTLibrarySection>>(
    ({item, index}) => {
      return <LibrarySectionItem section={item} elementWidth={400} />;
    },
    [],
  );

  const keyExtractor = useCallback((item: YTLibrarySection, index: number) => {
    return item.title + item.type;
  }, []);

  if (!data) {
    return <LoadingComponent />;
  }

  return (
    <FlatList
      data={data.sections}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      style={{marginStart: 10}}
      // onEndReached={onFetchMore}
      // ListHeaderComponent={ListHeaderComponent}
    />
  );
}
