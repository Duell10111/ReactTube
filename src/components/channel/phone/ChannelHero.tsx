import {MaterialIcons} from "@expo/vector-icons";
import {Image} from "expo-image";
import {PixelRatio, Pressable, StyleSheet, View} from "react-native";

import type {getTVChannelHeader} from "@/extraction/tvChannelHeader";
import {useTranslation} from "@/localization";
import {AppButton, AppText} from "@/ui/components";
import {resolveThumbnailUrl} from "@/ui/patterns/thumbnailSource";
import {useAppTheme} from "@/ui/theme";

const AVATAR_SIZE = 72;

interface ChannelHeroProps {
  header: ReturnType<typeof getTVChannelHeader>;
  onAbout: () => void;
  subscriptionLabel?: string;
  subscribed?: boolean;
  onSubscribe?: () => void;
  subscriptionPending?: boolean;
  subscriptionError?: boolean;
}

export function ChannelHero({
  header,
  onAbout,
  subscriptionLabel,
  subscribed,
  onSubscribe,
  subscriptionPending,
  subscriptionError,
}: ChannelHeroProps) {
  const {theme} = useAppTheme();
  const {t} = useTranslation();
  const avatar = resolveThumbnailUrl(
    header.avatar,
    AVATAR_SIZE,
    PixelRatio.get(),
  );
  const description = header.description?.replace(/\s+/g, " ").trim();

  return (
    <View
      style={{gap: theme.spacing.lg, paddingBottom: theme.spacing.md}}
      testID={"channel-hero"}>
      {header.wideBanner ? (
        <Image
          accessibilityIgnoresInvertColors
          contentFit={"cover"}
          source={{uri: header.wideBanner}}
          style={[
            styles.banner,
            {
              backgroundColor: theme.colors.surfaceRaised,
              borderRadius: theme.radii.card,
            },
          ]}
        />
      ) : null}
      <View style={[styles.identity, {gap: theme.spacing.lg}]}>
        {avatar ? (
          <Image
            accessibilityIgnoresInvertColors
            contentFit={"cover"}
            source={{uri: avatar}}
            style={[
              styles.avatar,
              {
                backgroundColor: theme.colors.surfaceRaised,
                borderRadius: theme.radii.round,
              },
            ]}
          />
        ) : (
          <MaterialIcons
            color={theme.colors.textSecondary}
            name={"account-circle"}
            size={AVATAR_SIZE}
          />
        )}
        <View style={[styles.name, {gap: theme.spacing.xs}]}>
          <AppText
            accessibilityRole={"header"}
            numberOfLines={2}
            variant={"titleLarge"}>
            {header.title ?? t("channel.title")}
          </AppText>
          {header.metadata ? (
            <AppText
              color={"textSecondary"}
              numberOfLines={2}
              variant={"bodySmall"}>
              {header.metadata}
            </AppText>
          ) : null}
        </View>
      </View>
      <Pressable
        accessibilityHint={t("channel.moreAbout")}
        accessibilityRole={"button"}
        onPress={onAbout}
        style={({pressed}) => [
          styles.about,
          {gap: theme.spacing.xs},
          pressed && styles.pressed,
        ]}
        testID={"channel-about"}>
        <AppText
          color={"textSecondary"}
          numberOfLines={2}
          style={styles.aboutText}
          variant={"bodySmall"}>
          {description || t("channel.moreAbout")}
        </AppText>
        <MaterialIcons
          color={theme.colors.textSecondary}
          name={"chevron-right"}
          size={20}
        />
      </Pressable>
      {subscriptionLabel && onSubscribe ? (
        <View style={{gap: theme.spacing.xs}}>
          <AppButton
            fullWidth
            label={subscriptionLabel}
            loading={subscriptionPending}
            onPress={onSubscribe}
            testID={"channel-subscribe"}
            variant={subscribed ? "secondary" : "primary"}
          />
          {subscriptionError ? (
            <AppText
              accessibilityRole={"alert"}
              color={"error"}
              variant={"labelSmall"}>
              {t("channel.subscriptionError")}
            </AppText>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {width: "100%", aspectRatio: 4},
  identity: {flexDirection: "row", alignItems: "center"},
  avatar: {width: AVATAR_SIZE, height: AVATAR_SIZE},
  name: {flex: 1},
  about: {flexDirection: "row", alignItems: "center"},
  aboutText: {flex: 1},
  pressed: {opacity: 0.6},
});
