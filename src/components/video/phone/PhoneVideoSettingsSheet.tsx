import {BottomSheetScrollView} from "@gorhom/bottom-sheet";
import React, {useEffect, useState} from "react";
import {StyleProp, StyleSheet, ViewStyle} from "react-native";

import {isAutoplayEnabled} from "./phoneAutoplayModel";

import {useVideoPlayerSettings} from "@/components/video/videoPlayer/settings/VideoPlayerSettingsContext";
import {PLAYBACK_SPEEDS} from "@/components/video/videoPlayer/settings/VideoPlayerSpeed";
import {useAppData} from "@/context/AppDataContext";
import {useSubtitleOptions} from "@/hooks/video/useSubtitleOptions";
import {useTranslation} from "@/localization";
import {AppListItem, AppText} from "@/ui/components";
import {SheetPanel} from "@/ui/patterns";
import {useAppTheme} from "@/ui/theme";
import {
  parsePlayerResolution,
  playerResolutions,
} from "@/utils/PlayerResolution";

type Page = "menu" | "resolution" | "speed" | "language" | "subtitles";

interface PhoneVideoSettingsSheetProps {
  open: boolean;
  onClose: () => void;
  containerStyle?: StyleProp<ViewStyle>;
  fullHeight?: boolean;
}

/**
 * The gear menu of the phone overlay player. TV opens the same settings as
 * separate transparent modal routes; on a touch screen a bottom sheet over
 * the still playing video is what YouTube does, so the pages live inside one
 * sheet instead.
 */
export function PhoneVideoSettingsSheet({
  open,
  onClose,
  containerStyle,
  fullHeight,
}: PhoneVideoSettingsSheetProps) {
  const {t} = useTranslation();
  const {theme} = useAppTheme();
  const [page, setPage] = useState<Page>("menu");
  const {
    speed = 1,
    setSpeed,
    languages,
    selectedLanguage,
    selectLanguage,
    selectedSubtitle,
    selectSubtitle,
  } = useVideoPlayerSettings();
  const subtitleOptions = useSubtitleOptions();
  const {appSettings, updateSettings} = useAppData();
  const autoplay = isAutoplayEnabled(appSettings);
  const resolution = parsePlayerResolution(appSettings);

  // Every opening starts at the menu, not at the page left last time.
  useEffect(() => {
    if (open) {
      setPage("menu");
    }
  }, [open]);

  const activeLanguage = selectedLanguage ?? languages.find(l => l.selected);
  const languageLabel = (language: (typeof languages)[number]) =>
    `${language.title ?? language.language ?? language.index}`;
  const speedLabel = (value: number) =>
    value === 1 ? t("video.player.speed.normal") : `${value}x`;
  const subtitleLabel =
    subtitleOptions.find(option => option.track?.id === selectedSubtitle?.id)
      ?.label ?? t("video.player.subtitles.off");

  const choose = (action: () => void) => {
    action();
    onClose();
  };

  const titles: Record<Page, string> = {
    menu: t("video.player.settings"),
    resolution: t("settings.videoResolution"),
    speed: t("video.player.speed"),
    language: t("video.player.language"),
    subtitles: t("video.player.subtitles"),
  };

  const back =
    page !== "menu" ? (
      <AppListItem
        icon={"arrow-back"}
        onPress={() => setPage("menu")}
        title={t("common.back")}
      />
    ) : null;

  return (
    <SheetPanel
      containerStyle={containerStyle}
      fullHeight={fullHeight}
      onClose={onClose}
      open={open}
      title={titles[page]}>
      <BottomSheetScrollView
        contentContainerStyle={[
          styles.content,
          {paddingBottom: theme.spacing.xl},
        ]}>
        {back}
        {page === "menu" ? (
          <>
            {!appSettings.vlcEnabled ? (
              <AppListItem
                icon={"high-quality"}
                onPress={() => setPage("resolution")}
                title={t("settings.videoResolution")}
                subtitle={t(resolution.labelKey)}
              />
            ) : null}
            <AppListItem
              icon={"speed"}
              onPress={() => setPage("speed")}
              title={t("video.player.speed")}
              trailingText={speedLabel(speed)}
            />
            {languages.length > 1 ? (
              <AppListItem
                icon={"audiotrack"}
                onPress={() => setPage("language")}
                title={t("video.player.language")}
                trailingText={
                  activeLanguage ? languageLabel(activeLanguage) : undefined
                }
              />
            ) : null}
            <AppListItem
              icon={"closed-caption"}
              onPress={() => setPage("subtitles")}
              title={t("video.player.subtitles")}
              trailingText={subtitleLabel}
            />
            <AppListItem
              icon={"play-circle-outline"}
              // A toggle, not a page: the sheet stays open to show the change.
              onPress={() => updateSettings({autoplayEnabled: !autoplay})}
              selected={autoplay}
              title={t("video.autoplay")}
              trailingText={
                autoplay ? t("common.enabled") : t("common.disabled")
              }
            />
          </>
        ) : null}
        {page === "resolution"
          ? Object.values(playerResolutions).map(option => (
              <AppListItem
                key={option.key}
                onPress={() => choose(() => updateSettings(option.settings))}
                selected={resolution.key === option.key}
                title={t(option.labelKey)}
              />
            ))
          : null}
        {page === "speed"
          ? PLAYBACK_SPEEDS.map(value => (
              <AppListItem
                key={value}
                onPress={() => choose(() => setSpeed?.(value))}
                selected={speed === value}
                title={speedLabel(value)}
              />
            ))
          : null}
        {page === "language"
          ? languages.map(language => (
              <AppListItem
                key={language.index}
                onPress={() => choose(() => selectLanguage(language))}
                selected={activeLanguage?.index === language.index}
                title={languageLabel(language)}
              />
            ))
          : null}
        {page === "subtitles" ? (
          subtitleOptions.length > 0 ? (
            subtitleOptions.map(option => (
              <AppListItem
                key={option.key}
                onPress={() => choose(() => selectSubtitle(option.track))}
                selected={selectedSubtitle?.id === option.track?.id}
                title={option.label}
              />
            ))
          ) : (
            <AppText style={styles.empty} variant={"body"}>
              {t("video.player.subtitles.none")}
            </AppText>
          )
        ) : null}
      </BottomSheetScrollView>
    </SheetPanel>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: 4,
  },
  empty: {
    padding: 16,
  },
});
