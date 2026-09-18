import React, {useCallback, useState} from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import SettingsSection from "../SettingsSection";

import {useYoutubeContext, useYoutubeTVContext} from "@/context/YoutubeContext";
import Logger from "@/utils/Logger";
import {
  DiagnosticsResult,
  formatDiagnostics,
  runDiagnostics,
} from "@/utils/PlaybackDiagnostics";

const Clipboard = !Platform.isTV ? require("expo-clipboard") : {};

const LOGGER = Logger.extend("PLAYBACK");

/**
 * Diagnose-Screen — Plan-Phase 0.1.
 *
 * Muss im **Release**-Build gelaufen sein, bevor Phase 1 beginnt: nur dort zeigt
 * sich, ob die JS-Engine den Player-Code ausführen kann. Im Debug-Build kann eine
 * andere Engine aktiv sein und das Ergebnis verfälschen.
 */
export default function PlaybackDiagnosticsScreen() {
  const youtube = useYoutubeContext();
  const tvYoutube = useYoutubeTVContext();
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<DiagnosticsResult[]>();
  const [error, setError] = useState<string>();

  const run = useCallback(() => {
    if (!youtube) {
      setError("Innertube-Session noch nicht bereit");
      return;
    }

    setRunning(true);
    setError(undefined);

    // Beide Instanzen prüfen: der Login der App hängt an der TV-Instanz
    // (useAccountData.ts nutzt useYoutubeTVContext), die Standard-Instanz bleibt
    // anonym. Nur so ist die Frage beantwortbar, ob der TV-Client mit Auth
    // wieder Streams liefert.
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
  }, [youtube, tvYoutube]);

  const copy = useCallback(() => {
    if (results) {
      Clipboard.setStringAsync(
        results.map(formatDiagnostics).join("\n\n"),
      ).catch(LOGGER.warn);
    }
  }, [results]);

  return (
    <ScrollView style={styles.container}>
      <SettingsSection sectionTitle={"Wiedergabe-Diagnose"}>
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.button}
            onPress={run}
            disabled={running}>
            <Text style={styles.buttonText}>
              {running ? "Läuft…" : "Diagnose starten"}
            </Text>
          </TouchableOpacity>
          {results ? (
            <TouchableOpacity style={styles.button} onPress={copy}>
              <Text style={styles.buttonText}>{"Kopieren"}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </SettingsSection>

      {running ? <ActivityIndicator style={styles.spinner} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {results ? (
        results.map(result => (
          <View key={result.session.label} style={styles.output}>
            <Text style={styles.mono}>{formatDiagnostics(result)}</Text>
          </View>
        ))
      ) : (
        <Text style={styles.hint}>
          {
            "Prüft JS-Engine, Player und alle Clients gegen ein Testvideo. Ergebnis"
          }
          {"im Release-Build erheben — im Debug-Build kann eine andere Engine"}
          {"aktiv sein."}
        </Text>
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
  button: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#556BFD",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
  },
  spinner: {
    marginTop: 24,
  },
  error: {
    margin: 24,
    color: "#ff6b6b",
  },
  hint: {
    margin: 24,
    color: "#a7a7a7",
  },
  output: {
    margin: 16,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#1c1c1e",
  },
  mono: {
    color: "#e5e5e7",
    fontFamily: "Courier",
    fontSize: 12,
    lineHeight: 18,
  },
});
