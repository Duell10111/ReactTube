import {
  BottomSheetModal,
  BottomSheetModalProvider,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import React, {
  createContext,
  ReactNode,
  useContext,
  useRef,
  useState,
} from "react";
import {StyleSheet} from "react-native";

import {PlaylistManagerList} from "@/components/playlists/PlaylistManagerList";
import usePlaylistManager from "@/hooks/playlist/usePlaylistManager";
import Logger from "@/utils/Logger";

// TODO: Bottom Sheet Context to save video in Playlist

interface PlaylistManagerContextType {
  save: (videoIDs: string[]) => void;
}

const PMContext = createContext<PlaylistManagerContextType>(
  {} as PlaylistManagerContextType,
);

const snapPoints = ["80%"];

const LOGGER = Logger.extend("PLAYLIST_MANAGER");

interface PlaylistManagerContextProps {
  children: ReactNode;
}

export function PlaylistManagerContext({
  children,
}: PlaylistManagerContextProps) {
  const bottomSheetModalRef = useRef<BottomSheetModal>();
  const {playlists, fetchPlaylists, saveVideoToPlaylist} = usePlaylistManager();
  const [videoIDs, setVideoIDs] = useState<string[]>([]);

  const contextValue: PlaylistManagerContextType = {
    save: vIDs => {
      setVideoIDs(vIDs);
      bottomSheetModalRef.current.present();
      bottomSheetModalRef.current.snapToIndex(0);
      console.log("SAVE: ", videoIDs);
      fetchPlaylists().catch(LOGGER.warn);
    },
  };

  return (
    <PMContext.Provider value={contextValue}>
      <BottomSheetModalProvider>
        <>
          {children}
          <BottomSheetModal
            ref={bottomSheetModalRef}
            index={0}
            snapPoints={snapPoints}
            backgroundStyle={styles.backgroundBottomSheet}>
            <BottomSheetView style={styles.contentContainer}>
              <PlaylistManagerList
                data={playlists}
                onPress={data =>
                  saveVideoToPlaylist(videoIDs, data.id)
                    .then(() => bottomSheetModalRef.current.close())
                    .then(LOGGER.warn)
                }
              />
            </BottomSheetView>
          </BottomSheetModal>
        </>
      </BottomSheetModalProvider>
    </PMContext.Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  contentContainer: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "#444444",
  },
  backgroundBottomSheet: {
    backgroundColor: "#444444",
  },
});

export function usePlaylistManagerContext() {
  return useContext(PMContext);
}
