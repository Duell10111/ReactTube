import {useEffect, useRef, useState} from "react";

import {useAccountContext} from "@/context/AccountContext";
import {useYoutubeContext} from "@/context/YoutubeContext";
import {getAllPlaylistsAsElementData} from "@/downloader/DBData";
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
    // No login present -> Use local Database instead
    if (loginData.accounts.length === 0) {
      getAllPlaylistsAsElementData().then(setData).catch(console.warn);
    } else if (youtube?.session.logged_in) {
      youtube?.music?.getLibrary().then(lib => {
        library.current = lib;
        lib.contents && setData(extractGrid(lib.contents[0]));
      });
    } else {
      // Fetch playlists from PlaylistManager
      fetchPlaylists().catch(console.warn);
    }
  }, []);

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
    data: data ?? playlists,
    fetchContinuation,
  };
}
