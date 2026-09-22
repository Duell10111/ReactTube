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
import {Pressable, StyleSheet} from "react-native";

import {PlaylistManagerCreatePanel} from "@/components/playlists/PlaylistManagerCreatePanel";
import {PlaylistManagerList} from "@/components/playlists/PlaylistManagerList";
import usePlaylistManager from "@/hooks/playlist/usePlaylistManager";
import {useTranslation} from "@/localization";
import {AppText} from "@/ui/components";
import {useAppTheme} from "@/ui/theme";
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
  const {t} = useTranslation();
  const {theme} = useAppTheme();

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
        <Pressable
          style={[
            styles.footerContainer,
            {
              backgroundColor: theme.colors.brand,
              borderRadius: theme.radii.card,
            },
          ]}
          onPress={() => setCreatePanel(!createPanel)}>
          <AppText style={{color: theme.colors.onBrand}} variant={"label"}>
            {t(createPanel ? "common.back" : "playlist.manager.add")}
          </AppText>
        </Pressable>
      </BottomSheetFooter>
    ),
    [createPanel, t, theme],
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
            backgroundStyle={{backgroundColor: theme.colors.surfaceRaised}}>
            <BottomSheetView
              style={[
                styles.contentContainer,
                {backgroundColor: theme.colors.surfaceRaised},
              ]}>
              {createPanel ? (
                <PlaylistManagerCreatePanel
                  onPlaylistCreate={name => {
                    setCreatePanel(false);
                    createPlaylist(name, []).catch(error => {
                      LOGGER.warn(error);
                      showMessage({
                        type: "warning",
                        message: t("playlist.manager.createError"),
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
                          message: t("playlist.manager.added"),
                        });
                      })
                      .catch(error => {
                        LOGGER.warn(error);
                        showMessage({
                          type: "warning",
                          message: t("playlist.manager.saveError"),
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
  contentContainer: {
    flex: 1,
    alignItems: "center",
  },
  footerContainer: {
    padding: 12,
    margin: 12,
    borderRadius: 12,
    alignItems: "center",
  },
});

export function usePlaylistManagerContext() {
  return useContext(PMContext);
}
