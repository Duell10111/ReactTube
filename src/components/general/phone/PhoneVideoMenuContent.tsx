import {MaterialIcons} from "@expo/vector-icons";
import {BottomSheetView} from "@gorhom/bottom-sheet";
import {Image} from "expo-image";
import React from "react";
import {StyleSheet, View} from "react-native";
import {useSafeAreaInsets} from "react-native-safe-area-context";

import type {ContextMenu, ElementData} from "@/extraction/Types";
import useVideoMenuActions from "@/hooks/general/useVideoMenuActions";
import {useTranslation} from "@/localization";
import {AppListItem, AppText, Divider} from "@/ui/components";
import {useAppTheme} from "@/ui/theme";

type IconName = React.ComponentProps<typeof MaterialIcons>["name"];

const entryIcons: Partial<Record<NonNullable<ContextMenu["type"]>, IconName>> =
  {
    addToPlaylist: "playlist-add",
    addToWatchLater: "watch-later",
  };

interface PhoneVideoMenuContentProps {
  element: ElementData;
  onOpenChannel: (channelId: string) => void;
  onAddToPlaylist: (videoId: string) => void;
  onClose: () => void;
}

/**
 * Body of the phone video menu sheet. The entries match the TV side panel
 * (`VideoMenu`), only laid out as a touch action list.
 */
export function PhoneVideoMenuContent({
  element,
  onOpenChannel,
  onAddToPlaylist,
  onClose,
}: PhoneVideoMenuContentProps) {
  const {data, entries, channelId, runEntry} = useVideoMenuActions(element);
  const {t} = useTranslation();
  const {theme} = useAppTheme();
  const insets = useSafeAreaInsets();

  return (
    <BottomSheetView
      style={{paddingBottom: insets.bottom + theme.spacing.md}}
      testID={"phone-video-menu"}>
      <View
        style={[
          styles.header,
          {
            gap: theme.spacing.md,
            paddingHorizontal: theme.spacing.lg,
            paddingBottom: theme.spacing.md,
          },
        ]}>
        <Image
          accessibilityIgnoresInvertColors
          contentFit={"cover"}
          source={
            data.thumbnailImage?.url
              ? {uri: data.thumbnailImage.url}
              : undefined
          }
          style={[
            styles.thumbnail,
            {
              backgroundColor: theme.colors.surfaceRaised,
              borderRadius: theme.radii.card,
            },
          ]}
        />
        <View style={styles.headerText}>
          <AppText numberOfLines={2} variant={"titleSmall"}>
            {data.title}
          </AppText>
          {data.author?.name ? (
            <AppText
              color={"textSecondary"}
              numberOfLines={1}
              variant={"bodySmall"}>
              {data.author.name}
            </AppText>
          ) : null}
        </View>
      </View>
      <Divider />
      {channelId ? (
        <AppListItem
          icon={"account-circle"}
          onPress={() => onOpenChannel(channelId)}
          title={t("menu.channel")}
        />
      ) : null}
      {entries.map((entry, index) => (
        <AppListItem
          icon={entry.type ? entryIcons[entry.type] : undefined}
          key={entry.text + index}
          onPress={() => runEntry(entry, {onDone: onClose, onAddToPlaylist})}
          title={entry.text}
        />
      ))}
    </BottomSheetView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
  },
  thumbnail: {
    width: 112,
    aspectRatio: 16 / 9,
  },
  headerText: {
    flex: 1,
  },
});
