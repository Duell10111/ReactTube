import {
  BottomSheetFooter,
  BottomSheetModal,
  BottomSheetModalProvider,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import {
  StyleSheet,
  Text,
  TouchableHighlight,
  TouchableOpacity,
  View,
} from "react-native";
import Animated from "react-native-reanimated";

import {PlaylistManagerCreatePanel} from "@/components/playlists/PlaylistManagerCreatePanel";
import {PlaylistManagerList} from "@/components/playlists/PlaylistManagerList";
import usePlaylistManager from "@/hooks/playlist/usePlaylistManager";
import Logger from "@/utils/Logger";
import {showMessage} from "@/utils/ShowFlashMessageHelper";

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
  const bottomSheetModalRef = useRef<BottomSheetModal>(undefined);
  const {playlists, fetchPlaylists, saveVideoToPlaylist, createPlaylist} =
    usePlaylistManager();
  const [videoIDs, setVideoIDs] = useState<string[]>([]);
  const [createPanel, setCreatePanel] = useState(false);

  const contextValue: PlaylistManagerContextType = {
    save: vIDs => {
      setVideoIDs(vIDs);
      bottomSheetModalRef.current?.present();
      bottomSheetModalRef.current?.snapToIndex(0);
      fetchPlaylists().catch(LOGGER.warn);
    },
  };

  // renders
  const renderFooter = useCallback(
    props => (
      <BottomSheetFooter {...props} bottomInset={24}>
        <TouchableOpacity
          style={styles.footerContainer}
          onPress={() => setCreatePanel(!createPanel)}>
          <Text>{createPanel ? "Back" : "Add Playlist"}</Text>
        </TouchableOpacity>
      </BottomSheetFooter>
    ),
    [createPanel],
  );

  return (
    <PMContext.Provider value={contextValue}>
      <BottomSheetModalProvider>
        <>
          {children}
          <BottomSheetModal
            // @ts-ignore
            ref={bottomSheetModalRef}
            index={0}
            snapPoints={snapPoints}
            footerComponent={renderFooter}
            backgroundStyle={styles.backgroundBottomSheet}>
            <BottomSheetView style={styles.contentContainer}>
              {createPanel ? (
                <PlaylistManagerCreatePanel
                  onPlaylistCreate={name => {
                    setCreatePanel(false);
                    createPlaylist(name, []).catch(error => {
                      LOGGER.warn(error);
                      showMessage({
                        type: "warning",
                        message: "Error creating playlist",
                        description: error,
                      });
                    });
                  }}
                />
              ) : (
                <PlaylistManagerList
                  data={playlists ?? []}
                  onPress={data =>
                    saveVideoToPlaylist(videoIDs, data.id)
                      .then(() => bottomSheetModalRef.current?.close())
                      .then(() => {
                        showMessage({
                          type: "success",
                          message: "Added to playlist",
                        });
                      })
                      .catch(error => {
                        LOGGER.warn(error);
                        showMessage({
                          type: "warning",
                          message: "Error saving video to playlist",
                          description: error,
                        });
                      })
                  }
                />
              )}
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
  footerContainer: {
    padding: 12,
    margin: 12,
    borderRadius: 12,
    backgroundColor: "#80f",
  },
});

export function usePlaylistManagerContext() {
  return useContext(PMContext);
}
