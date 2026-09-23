import {NavigationRouteContext, useNavigation} from "@react-navigation/native";
import {useCallback, useContext} from "react";

import {
  resolveMediaCardRoute,
  type MediaCardRoutingOptions,
} from "./mediaCardRouting";

import {useMusikPlayerContext} from "@/context/MusicPlayerContext";
import type {ElementData} from "@/extraction/Types";
import useElementPressableHelper from "@/hooks/utils/useElementPressableHelper";
import type {NativeStackProp} from "@/navigation/types";

type MediaCardPressOptions = Pick<MediaCardRoutingOptions, "music">;

/**
 * Default press behavior of a media card. Videos, playlists, and channels used
 * to be routed in the phone and TV card separately, which is why only one of
 * them opened channels. The decision itself lives in `mediaCardRouting`.
 */
export function useMediaCardPress(
  element: ElementData,
  options?: MediaCardPressOptions,
) {
  const navigation = useNavigation<NativeStackProp>();
  // Read instead of `useRoute`, which throws outside a screen: cards also live
  // in the playlist-manager sheet, which is mounted next to the navigator.
  const currentRouteName = useContext(NavigationRouteContext)?.name;
  const {onPress: openElement} = useElementPressableHelper();
  const {setCurrentItem} = useMusikPlayerContext();
  const music = options?.music === true;

  return useCallback(() => {
    const {target, replace} = resolveMediaCardRoute(element, {
      music,
      currentRouteName,
    });

    if (target.kind === "album") {
      const params = {albumId: element.id};
      if (replace) {
        navigation.replace(target.routeName, params);
      } else {
        navigation.navigate(target.routeName, params);
      }
      return;
    }

    if (target.kind === "playlist") {
      const params = {playlistId: element.id};
      if (replace) {
        navigation.replace(target.routeName, params);
      } else {
        navigation.navigate(target.routeName, params);
      }
      return;
    }

    if (target.kind === "channel") {
      if (target.routeName === "MusicChannelScreen") {
        navigation.navigate(target.routeName, {artistId: element.id});
      } else {
        navigation.navigate(target.routeName, {channelId: element.id});
      }
      return;
    }

    if (
      target.kind === "musicPlayer" &&
      (element.type === "video" || element.type === "mix")
    ) {
      setCurrentItem(element);
      navigation.navigate("MusicPlayerScreen");
      return;
    }

    openElement(element);
  }, [
    currentRouteName,
    element,
    music,
    navigation,
    openElement,
    setCurrentItem,
  ]);
}
