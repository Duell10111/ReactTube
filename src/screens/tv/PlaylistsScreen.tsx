import LoadingComponent from "@/components/general/LoadingComponent";
import GridFeedView from "@/components/grid/GridFeedView";
import {SectionTitle} from "@/components/library/SectionTitle";
import ShelfVideoSelectorProvider from "@/context/ShelfVideoSelector";
import usePlaylists from "@/hooks/tv/usePlaylists";

export function PlaylistsScreen() {
  const {data, fetchMore} = usePlaylists();

  if (!data) {
    return <LoadingComponent />;
  }

  return (
    <ShelfVideoSelectorProvider>
      <SectionTitle title={"Playlists"} />
      <GridFeedView items={data} onEndReached={fetchMore} />
    </ShelfVideoSelectorProvider>
  );
}
