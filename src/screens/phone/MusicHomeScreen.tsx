import {useNavigation} from "@react-navigation/native";
import {NativeStackNavigationProp} from "@react-navigation/native-stack";
import React, {useEffect} from "react";

import useMusicHome from "../../hooks/music/useMusicHome";

import usePhoneOrientationLocker from "@/hooks/ui/usePhoneOrientationLocker";
import {useTranslation} from "@/localization";
import {RootStackParamList} from "@/navigation/RootStackNavigator";
import {AppIconButton} from "@/ui/components";
import {MediaFeed} from "@/ui/patterns";

export function MusicHomeScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {data, fetchContinuation, refreshing, refresh, loading, error} =
    useMusicHome();
  const {t} = useTranslation();

  useEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <AppIconButton
          accessibilityLabel={t("navigation.musicLibrary")}
          icon={"library-music"}
          onPress={() => navigation.navigate("MusicLibraryScreen")}
        />
      ),
      headerRight: () => (
        <AppIconButton
          accessibilityLabel={t("navigation.musicSearch")}
          icon={"search"}
          onPress={() => navigation.navigate("MusicSearchScreen")}
        />
      ),
    });
  }, [navigation, t]);

  // TODO: Could cause locks if screen is still loaded in background
  usePhoneOrientationLocker();

  return (
    <MediaFeed
      error={error}
      items={data ?? []}
      loading={loading}
      onEndReached={fetchContinuation}
      onRefresh={refresh}
      onRetry={refresh}
      refreshing={refreshing}
      testID={"music-home-feed"}
    />
  );
}
