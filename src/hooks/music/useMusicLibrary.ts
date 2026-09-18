import {useEffect, useMemo, useRef, useState} from "react";

import {useAccountContext} from "@/context/AccountContext";
import {useYoutubeContext} from "@/context/YoutubeContext";
import {isLocalPlaylist} from "@/downloader/DBData";
import {parseObservedArray} from "@/extraction/ArrayExtraction";
import {extractGrid} from "@/extraction/GridExtraction";
import {ElementData} from "@/extraction/Types";
import usePlaylistManager from "@/hooks/playlist/usePlaylistManager";
import {YTMusic} from "@/utils/Youtube";

export default function useMusicLibrary() {
  const youtube = useYoutubeContext();
  const library = useRef<YTMusic.Library>(undefined);
  const continuation = useRef<YTMusic.LibraryContinuation>(undefined);
  const [data, setData] = useState<ElementData[]>();
  const {loginData} = useAccountContext();
  const {playlists, fetchPlaylists} = usePlaylistManager();

  useEffect(() => {
    if (loginData.accounts.length > 0 && youtube?.session.logged_in) {
      youtube?.music?.getLibrary().then(lib => {
        library.current = lib;
        lib.contents && setData(extractGrid(lib.contents[0]));
      });
    } else if (loginData.accounts.length > 0) {
      // Fetch playlists from PlaylistManager
      fetchPlaylists().catch(console.warn);
    }
  }, []);

  const libraryData = useMemo(() => {
    // `playlists` is backed by a live database query. Returning it directly in
    // local mode keeps playlists created after this hook mounted visible to
    // consumers such as the Watch sync listener.
    if (loginData.accounts.length === 0) {
      return playlists;
    }

    // The remote music library does not contain locally stored playlists.
    // Add those explicitly and avoid duplicates if a source exposes the same
    // playlist more than once.
    const localPlaylists = (playlists ?? []).filter(playlist =>
      isLocalPlaylist(playlist.id),
    );
    const localIds = new Set(localPlaylists.map(playlist => playlist.id));
    return [
      ...localPlaylists,
      ...(data ?? []).filter(element => !localIds.has(element.id)),
    ];
  }, [data, loginData.accounts.length, playlists]);

  const fetchContinuation = () => {
    const lib = continuation.current ?? library.current;
    if (lib?.has_continuation) {
      lib.getContinuation().then(cont => {
        continuation.current = cont;
        console.log("Continue: ", cont);
        cont.contents.contents &&
          setData([
            ...(data ?? []),
            ...parseObservedArray(cont.contents.contents),
          ]);
      });
    }
  };

  return {
    data: libraryData,
    fetchContinuation,
  };
}
