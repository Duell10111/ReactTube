import {useCallback, useState} from "react";
import {FlatList, ListRenderItem} from "react-native";

import LoadingComponent from "@/components/general/LoadingComponent";
import {LibrarySectionItem} from "@/components/library/LibrarySectionItem";
import {YTLibrarySection} from "@/extraction/Types";
import useLibrary from "@/hooks/useLibrary";

interface LibraryScreenProps {}

export function LibraryScreen({}: LibraryScreenProps) {
  const {data} = useLibrary();
  const [details, setDetails] = useState<YTLibrarySection>();

  const renderItem = useCallback<ListRenderItem<YTLibrarySection>>(
    ({item, index}) => {
      return <LibrarySectionItem section={item} />;
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
      // onEndReached={onFetchMore}
      // ListHeaderComponent={ListHeaderComponent}
    />
  );
}
