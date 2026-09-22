import {StyleSheet, View} from "react-native";
import {ProgressBar} from "react-native-paper";

import {WatchFileTransferInfo} from "@/context/DownloaderContext";
import {useTranslation} from "@/localization";
import {AppText} from "@/ui/components";
import {getTransferPercent} from "@/ui/patterns";
import {useAppTheme} from "@/ui/theme";

interface Props {
  upload: WatchFileTransferInfo;
}

export default function ActiveUploadListItem({upload}: Props) {
  const {theme} = useAppTheme();
  const {t} = useTranslation();

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
          <AppText numberOfLines={1}>
            {upload?.uri.split("/").reverse()?.[1]}
          </AppText>
          <AppText color={"textSecondary"} variant={"bodySmall"}>
            {t("transfer.progress", {
              percent: getTransferPercent(upload.process),
            })}
          </AppText>
        </View>
      </View>
      <ProgressBar
        animatedValue={upload.process}
        color={theme.colors.mediaProgress}
      />
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
