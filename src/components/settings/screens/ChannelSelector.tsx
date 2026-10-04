import {useEffect} from "react";
import {ScrollView, StyleSheet} from "react-native";

import {SettingsSelectorItem} from "../SettingsItem";
import SettingsSection from "../SettingsSection";

import {useAccountContext} from "@/context/AccountContext";
import {useYoutubeTVContext} from "@/context/YoutubeContext";
import {useTranslation} from "@/localization";
import {AppText, ErrorState, Skeleton} from "@/ui/components";
import {useAppTheme} from "@/ui/theme";
import {hasChannelChoice} from "@/utils/accountChannels";

/**
 * Picks the channel the signed-in account acts as — the primary account or
 * one of its brand channels (`onBehalfOfUser`, see `accountChannels.ts`).
 */
export default function ChannelSelectorScreen() {
  const {
    channels,
    channelsLoading,
    channelsError,
    loadChannels,
    selectChannel,
  } = useAccountContext();
  const signedIn = !!useYoutubeTVContext()?.session.logged_in;
  const {t} = useTranslation();
  const {theme} = useAppTheme();

  useEffect(() => {
    loadChannels();
  }, [loadChannels]);

  const message = (text: string) => (
    <AppText color={"textSecondary"} style={{margin: theme.spacing.xl}}>
      {text}
    </AppText>
  );

  const content = () => {
    if (!signedIn) {
      return message(t("settings.channel.signedOut"));
    }

    if (channelsLoading && !channels) {
      return (
        <Skeleton
          accessibilityLabel={t("settings.channel.loading")}
          height={120}
          style={{margin: theme.spacing.xl}}
        />
      );
    }

    if (channelsError) {
      return (
        <ErrorState
          message={t("settings.channel.loadFailed")}
          onRetry={loadChannels}
        />
      );
    }

    if (!channels?.length) {
      return null;
    }

    if (!hasChannelChoice(channels)) {
      return message(t("settings.channel.noChoice", {name: channels[0].name}));
    }

    return (
      <>
        <SettingsSection sectionTitle={t("settings.channel.title")}>
          {channels.map(channel => (
            <SettingsSelectorItem
              key={channel.pageId ?? "primary"}
              label={channel.name}
              subtitle={[
                channel.handle,
                t(
                  channel.pageId
                    ? "settings.channel.brandChannel"
                    : "settings.channel.primaryAccount",
                ),
              ]
                .filter(Boolean)
                .join(" · ")}
              selected={channel.selected}
              onPress={() => selectChannel(channel)}
            />
          ))}
        </SettingsSection>
        {message(t("settings.channel.hint"))}
      </>
    );
  };

  return (
    <ScrollView
      style={[styles.container, {backgroundColor: theme.colors.background}]}>
      {content()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingVertical: 20,
  },
});
