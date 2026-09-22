import {useNavigation, useRoute} from "@react-navigation/native";
import {useCallback} from "react";

import {useMusikPlayerContext} from "@/context/MusicPlayerContext";
import type {ElementData} from "@/extraction/Types";
import useElementPressableHelper from "@/hooks/utils/useElementPressableHelper";
import type {NativeStackProp, RootRouteProp} from "@/navigation/types";

/**
 * Default press behavior of a media card. Videos, playlists, and channels used
 * to be routed in the phone and TV card separately, which is why only one of
 * them opened channels.
 */
export function useMediaCardPress(element: ElementData) {
  const navigation = useNavigation<NativeStackProp>();
  const route = useRoute<RootRouteProp>();
  const {onPress: openElement} = useElementPressableHelper();
  const {setCurrentItem} = useMusikPlayerContext();

  return useCallback(() => {
    if (element.type === "playlist" || element.type === "album") {
      const routeName =
        element.type === "album"
          ? "MusicAlbumScreen"
          : element.music
            ? "MusicPlaylistScreen"
            : "PlaylistScreen";

      // Replacing instead of stacking keeps the back stack free of a chain of
      // playlists when one playlist links to the next.
      if (route.name === routeName) {
        if (routeName === "MusicAlbumScreen") {
          navigation.replace(routeName, {albumId: element.id});
        } else {
          navigation.replace(routeName, {playlistId: element.id});
        }
      } else {
        if (routeName === "MusicAlbumScreen") {
          navigation.navigate(routeName, {albumId: element.id});
        } else {
          navigation.navigate(routeName, {playlistId: element.id});
        }
      }

      return;
    }

    if (
      element.type === "channel" ||
      element.type === "artist" ||
      element.type === "profile"
    ) {
      if (element.music) {
        navigation.navigate("MusicChannelScreen", {artistId: element.id});
      } else {
        navigation.navigate("ChannelScreen", {channelId: element.id});
      }

      return;
    }

    if (element.music && (element.type === "video" || element.type === "mix")) {
      setCurrentItem(element);
      navigation.navigate("MusicPlayerScreen");
      return;
    }

    openElement(element);
  }, [element, navigation, openElement, route.name, setCurrentItem]);
}
