import React, {useCallback, useState} from "react";
import {Platform, ScrollView, StyleSheet, View} from "react-native";

import SettingsSection from "../SettingsSection";

import {useYoutubeContext, useYoutubeTVContext} from "@/context/YoutubeContext";
import {useTranslation} from "@/localization";
import {AppButton, AppText, ErrorState, Skeleton} from "@/ui/components";
import {useAppTheme} from "@/ui/theme";
import Logger from "@/utils/Logger";
import {
  DiagnosticsResult,
  formatDiagnostics,
  runDiagnostics,
} from "@/utils/PlaybackDiagnostics";

const Clipboard = !Platform.isTV ? require("expo-clipboard") : {};

const LOGGER = Logger.extend("PLAYBACK");

/** Player diagnostics should be collected in a release build because a debug
 * build can use a different JavaScript engine and distort the result. */
export default function PlaybackDiagnosticsScreen() {
  const youtube = useYoutubeContext();
  const tvYoutube = useYoutubeTVContext();
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<DiagnosticsResult[]>();
  const [error, setError] = useState<string>();
  const {t} = useTranslation();
  const {theme} = useAppTheme();

  const run = useCallback(() => {
    if (!youtube) {
      setError(t("settings.diagnostics.sessionUnavailable"));
      return;
    }

    setRunning(true);
    setError(undefined);

    // Check both sessions: account access uses the TV session while the default
    // session remains anonymous, so either client can be the failing path.
    (async () => {
      const collected: DiagnosticsResult[] = [];

      collected.push(
        await runDiagnostics(youtube, {label: "Standard-Instanz"}),
      );

      if (tvYoutube && tvYoutube !== youtube) {
        collected.push(
          await runDiagnostics(tvYoutube, {
            label: "TV-Instanz",
            includeTvNamespace: true,
          }),
        );
      }

      return collected;
    })()
      .then(collected => {
        setResults(collected);
        LOGGER.info(
          "Diagnose:\n" + collected.map(formatDiagnostics).join("\n\n"),
        );
      })
      .catch(e => setError(String(e?.message ?? e)))
      .finally(() => setRunning(false));
  }, [t, youtube, tvYoutube]);

  const copy = useCallback(() => {
    if (results) {
      Clipboard.setStringAsync(
        results.map(formatDiagnostics).join("\n\n"),
      ).catch(LOGGER.warn);
    }
  }, [results]);

  return (
    <ScrollView
      contentContainerStyle={{paddingBottom: theme.spacing.xxl}}
      style={[styles.container, {backgroundColor: theme.colors.background}]}>
      <SettingsSection sectionTitle={t("settings.playbackDiagnostics")}>
        <View style={[styles.buttonRow, {gap: theme.spacing.md}]}>
          <AppButton
            label={
              running
                ? t("settings.diagnostics.running")
                : t("settings.diagnostics.run")
            }
            loading={running}
            onPress={run}
          />
          {results ? (
            <AppButton
              label={t("common.copy")}
              onPress={copy}
              variant={"secondary"}
            />
          ) : null}
        </View>
      </SettingsSection>

      {running ? (
        <Skeleton
          accessibilityLabel={t("settings.diagnostics.running")}
          height={120}
          style={{margin: theme.spacing.xl}}
        />
      ) : null}
      {error ? <ErrorState message={error} onRetry={run} /> : null}

      {results ? (
        results.map(result => (
          <View
            key={result.session.label}
            style={[
              styles.output,
              {
                backgroundColor: theme.colors.surfaceRaised,
                borderRadius: theme.radii.control,
              },
            ]}>
            <AppText style={styles.mono} variant={"bodySmall"}>
              {formatDiagnostics(result)}
            </AppText>
          </View>
        ))
      ) : (
        <AppText color={"textSecondary"} style={{margin: theme.spacing.xl}}>
          {t("settings.diagnostics.hint")}
        </AppText>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  buttonRow: {
    flexDirection: "row",
    paddingVertical: 12,
    paddingRight: 24,
    gap: 12,
  },
  output: {
    margin: 16,
    padding: 12,
  },
  mono: {
    fontFamily: "Courier",
  },
});
