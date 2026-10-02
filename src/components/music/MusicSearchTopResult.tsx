import {MaterialCommunityIcons, MaterialIcons} from "@expo/vector-icons";
import {useNavigation} from "@react-navigation/native";
import {Image} from "expo-image";
import React, {useMemo} from "react";
import {Pressable, StyleSheet, View} from "react-native";

import {
  getTopResultActions,
  resolveMusicEndpointTarget,
} from "@/components/music/musicSearchModel";
import {MusicTrackRow} from "@/components/music/sections/MusicTrackRow";
import {useMusikPlayerContext} from "@/context/MusicPlayerContext";
import type {
  HorizontalData,
  HorizontalDataButton,
} from "@/extraction/ShelfExtraction";
import type {RootNavProp} from "@/navigation/RootStackNavigator";
import {AppText} from "@/ui/components";
import {useAppTheme} from "@/ui/theme";
import Logger from "@/utils/Logger";

const LOGGER = Logger.extend("SEARCH_TOP_RESULT");

const thumbnailSize = 56;

const actionIcons: Record<
  HorizontalDataButton["type"],
  React.ComponentProps<typeof MaterialCommunityIcons>["name"]
> = {
  PLAY: "play",
  SHUFFLE: "shuffle-variant",
  MIX: "radio-tower",
  PLAYLIST_ADD: "playlist-plus",
};

interface MusicSearchTopResultProps {
  data: HorizontalData;
}

/**
 * The card Music puts above every other search result: the best match with
 * its avatar or cover, up to two play actions, and a few of its entries.
 */
export function MusicSearchTopResult({data}: MusicSearchTopResultProps) {
  const {theme} = useAppTheme();
  const navigation = useNavigation<RootNavProp>();
  const {setPlaylistViaEndpoint} = useMusikPlayerContext();
  const target = useMemo(
    () => resolveMusicEndpointTarget(data.on_tab),
    [data.on_tab],
  );
  const actions = useMemo(
    () => getTopResultActions(data.buttons),
    [data.buttons],
  );
  const round = target?.kind === "artist";

  const play = (endpoint: HorizontalDataButton["endpoint"]) => {
    if (!endpoint) {
      return;
    }
    setPlaylistViaEndpoint(endpoint);
    navigation.navigate("MusicPlayerScreen");
  };

  const onHeaderPress = () => {
    switch (target?.kind) {
      case "play":
        play(data.on_tab);
        break;
      case "artist":
        navigation.push("MusicChannelScreen", {artistId: target.id});
        break;
      case "album":
        navigation.push("MusicAlbumScreen", {albumId: target.id});
        break;
      case "playlist":
        navigation.navigate("MusicPlaylistScreen", {playlistId: target.id});
        break;
      default:
        LOGGER.warn(
          `Top result endpoint not handled: ${data.on_tab?.command?.type}`,
        );
    }
  };

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surfaceRaised,
          borderRadius: theme.radii.card,
          gap: theme.spacing.md,
          paddingVertical: theme.spacing.md,
        },
      ]}>
      <Pressable
        accessibilityLabel={[data.title, data.subtitle]
          .filter(Boolean)
          .join(", ")}
        accessibilityRole={"button"}
        disabled={!target}
        onPress={onHeaderPress}
        style={({pressed}) => [
          styles.header,
          {
            gap: theme.spacing.md,
            paddingHorizontal: theme.spacing.md,
            opacity: pressed ? 0.7 : 1,
          },
        ]}>
        <View
          style={[
            styles.thumbnail,
            {
              borderRadius: round ? theme.radii.round : theme.radii.control,
              backgroundColor: theme.colors.surfacePressed,
            },
          ]}>
          {data.thumbnail?.url ? (
            <Image
              accessibilityIgnoresInvertColors
              contentFit={"cover"}
              source={{uri: data.thumbnail.url}}
              style={styles.image}
            />
          ) : null}
        </View>
        <View style={styles.text}>
          <AppText numberOfLines={1} variant={"titleSmall"}>
            {data.title}
          </AppText>
          {data.subtitle ? (
            <AppText
              color={"textSecondary"}
              numberOfLines={1}
              variant={"bodySmall"}>
              {data.subtitle}
            </AppText>
          ) : null}
        </View>
        {target && target.kind !== "play" ? (
          <MaterialIcons
            color={theme.colors.textPrimary}
            name={"chevron-right"}
            size={24}
          />
        ) : null}
      </Pressable>
      {actions.length > 0 ? (
        <View
          style={[
            styles.actions,
            {gap: theme.spacing.sm, paddingHorizontal: theme.spacing.md},
          ]}>
          {actions.map((action, index) => {
            const primary = index === 0;
            const foreground = primary
              ? theme.colors.background
              : theme.colors.textPrimary;
            return (
              <Pressable
                accessibilityLabel={action.title}
                accessibilityRole={"button"}
                key={`${action.type}-${index}`}
                onPress={() => play(action.endpoint)}
                style={({pressed}) => [
                  styles.action,
                  {
                    gap: theme.spacing.xs,
                    borderRadius: theme.radii.round,
                    borderColor: primary
                      ? theme.colors.textPrimary
                      : theme.colors.divider,
                    backgroundColor: primary
                      ? theme.colors.textPrimary
                      : theme.colors.focusResting,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}>
                <MaterialCommunityIcons
                  color={foreground}
                  name={actionIcons[action.type]}
                  size={20}
                />
                {action.title ? (
                  <AppText
                    numberOfLines={1}
                    style={{color: foreground}}
                    variant={"label"}>
                    {action.title}
                  </AppText>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      ) : null}
      {data.parsedData.length > 0 ? (
        <View style={{paddingHorizontal: theme.spacing.xs}}>
          {data.parsedData.map((element, index) => (
            <MusicTrackRow
              element={element}
              key={`${element.id}-${index}`}
              videoFrame
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
  },
  thumbnail: {
    width: thumbnailSize,
    height: thumbnailSize,
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  text: {
    flex: 1,
  },
  actions: {
    flexDirection: "row",
  },
  action: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 40,
    borderWidth: 1,
  },
});
