import {useEffect, useMemo, useState} from "react";
import {Platform} from "react-native";

import SiriMedia from "../../../modules/siri-media";

import {useAccountContext} from "@/context/AccountContext";
import {useAppData} from "@/context/AppDataContext";
import {useYoutubeTVContext} from "@/context/YoutubeContext";
import {
  useDownloadedVideos,
  usePlaylists,
} from "@/downloader/DownloadDatabaseOperations";
import {parseObservedArray} from "@/extraction/ArrayExtraction";
import {setSiriAccountPlaylists} from "@/hooks/siri/siriLibrary";
import type {SiriLibraryPlaylist} from "@/siri/matchSiriLibrary";
import Logger from "@/utils/Logger";

const LOGGER = Logger.extend("SIRI");

/**
 * Tells Siri about the user's library while Siri playback is enabled:
 * playlist names as vocabulary (so "play my playlist Sport" is recognized)
 * and the library size (Siri ranks media apps by it). Both are cleared when
 * Siri playback is turned off.
 */
export default function useSiriLibrarySync() {
  const {appSettings} = useAppData();
  const enabled = !!appSettings.siriPlaybackEnabled;
  const {loginData, autoLoginFinished} = useAccountContext();
  // Stored credentials fill loginData at once, but the session only signs in
  // afterwards; asking earlier returns the signed-out (empty) library.
  const loggedIn = loginData.accounts.length > 0 && autoLoginFinished;
  const youtubeTV = useYoutubeTVContext();

  const localPlaylists = usePlaylists();
  const downloads = useDownloadedVideos();
  const [accountPlaylists, setAccountPlaylists] = useState<
    SiriLibraryPlaylist[]
  >([]);

  // The first page of account playlists is enough for voice requests.
  useEffect(() => {
    if (!SiriMedia || Platform.isTV || !enabled || !loggedIn || !youtubeTV) {
      setAccountPlaylists([]);
      return;
    }
    let cancelled = false;
    youtubeTV.tv
      .getPlaylists()
      .then(feed => {
        if (cancelled || !feed.contents) {
          return;
        }
        setAccountPlaylists(
          // The TV library shows the user's own playlists as tiles that start
          // playback, which the extraction reports as "mix".
          parseObservedArray(feed.contents).flatMap(item =>
            (item.type === "playlist" || item.type === "mix") && item.title
              ? [{id: item.id, title: item.title, source: "account" as const}]
              : [],
          ),
        );
      })
      .catch(error => LOGGER.warn("Loading account playlists failed", error));
    return () => {
      cancelled = true;
    };
  }, [enabled, loggedIn, youtubeTV]);

  useEffect(() => {
    setSiriAccountPlaylists(accountPlaylists);
  }, [accountPlaylists]);

  const playlistTitles = useMemo(
    () => [
      ...new Set(
        [
          ...(localPlaylists ?? []).map(playlist => playlist.name ?? ""),
          ...accountPlaylists.map(playlist => playlist.title),
        ].filter(Boolean),
      ),
    ],
    [localPlaylists, accountPlaylists],
  );
  const libraryItemCount = playlistTitles.length + (downloads ?? []).length;

  useEffect(() => {
    if (!SiriMedia || Platform.isTV) {
      return;
    }
    if (enabled) {
      SiriMedia.updateLibraryContext(playlistTitles, libraryItemCount);
    } else {
      SiriMedia.updateLibraryContext([], 0);
    }
  }, [enabled, playlistTitles, libraryItemCount]);
}
