import {useEffect, useState} from "react";
import {DeviceEventEmitter, StyleSheet, View} from "react-native";
import {ProgressBar} from "react-native-paper";

import {
  DownloadObject,
  getVideoDownloadEventUpdate,
} from "@/hooks/downloader/useDownloadProcessor";
import {useTranslation} from "@/localization";
import {AppText} from "@/ui/components";
import {getTransferPercent} from "@/ui/patterns";
import {useAppTheme} from "@/ui/theme";

interface Props {
  download: DownloadObject;
}

export default function ActiveDownloadListItem({download}: Props) {
  const {theme} = useAppTheme();
  const {t} = useTranslation();

  const [process, setProcess] = useState(download.process);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(
      getVideoDownloadEventUpdate(download.id),
      (p: number) => {
        setProcess(p);
      },
    );
    return () => {
      sub.remove();
    };
  }, []);

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.divider,
          borderRadius: theme.radii.control,
          gap: theme.spacing.sm,
          padding: theme.spacing.md,
        },
      ]}>
      <View style={styles.container}>
        <View style={styles.textContainer}>
          <AppText numberOfLines={1}>{download.id}</AppText>
          <AppText color={"textSecondary"} variant={"bodySmall"}>
            {t("transfer.progress", {percent: getTransferPercent(process)})}
          </AppText>
        </View>
      </View>
      <ProgressBar animatedValue={process} color={theme.colors.mediaProgress} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 48,
  },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
  },
  textContainer: {
    justifyContent: "center",
    flex: 1,
  },
});
