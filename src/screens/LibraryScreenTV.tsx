import LoadingComponent from "@/components/general/LoadingComponent";
import GridFeedView from "@/components/grid/GridFeedView";
import {LibraryHeaderTV} from "@/components/library/LibraryHeaderTV";
import ShelfVideoSelectorProvider from "@/context/ShelfVideoSelector";
import useLibrary from "@/hooks/tv/useLibrary";

export function LibraryScreenTV() {
  const {data} = useLibrary();

  // TODO: Integrate old YTLibrarySection Items again?!

  // const renderItem = useCallback<ListRenderItem<YTLibrarySection>>(
  //   ({item, index}) => {
  //     return <LibrarySectionItem section={item} elementWidth={400} />;
  //   },
  //   [],
  // );
  //
  // const keyExtractor = useCallback((item: YTLibrarySection, index: number) => {
  //   return item.title + item.type;
  // }, []);

  if (!data) {
    return <LoadingComponent />;
  }

  return (
    <ShelfVideoSelectorProvider>
      <GridFeedView items={data} ListHeaderComponent={LibraryHeaderTV} />
    </ShelfVideoSelectorProvider>
  );
}
