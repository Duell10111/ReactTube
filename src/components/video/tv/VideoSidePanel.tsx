import React, {useMemo} from "react";
import {StyleSheet, TVFocusGuideView, View} from "react-native";

import type {ElementData} from "@/extraction/Types";
import type {VideoComments} from "@/hooks/comments/useVideoComments";
import {useTranslation} from "@/localization";
import {AppIconButton, AppText, Chip} from "@/ui/components";
import {
  CommentList,
  VideoDescriptionPanel,
  VideoQueuePanel,
  type VideoDetailViewModel,
} from "@/ui/patterns";
import {useAppTheme} from "@/ui/theme";

export type VideoSidePanelTab = "details" | "comments" | "queue";

interface VideoSidePanelProps {
  visible: boolean;
  model: VideoDetailViewModel;
  comments: VideoComments;
  queueEntries: ElementData[];
  tab: VideoSidePanelTab;
  onTabChange: (tab: VideoSidePanelTab) => void;
  onClose: () => void;
}

/**
 * Detail panel of the TV player. It takes the right third of the screen and
 * leaves the video playing beside it, which is the whole point of a panel here:
 * on a TV, reading the description must not mean leaving the video.
 *
 * Focus is trapped inside the panel while it is open, so the D-pad cannot land
 * on a player control that is hidden behind it.
 */
export function VideoSidePanel({
  visible,
  model,
  comments,
  queueEntries,
  tab,
  onTabChange,
  onClose,
}: VideoSidePanelProps) {
  const {theme} = useAppTheme();
  const {t} = useTranslation();

  const tabs = useMemo(() => {
    const entries: {id: VideoSidePanelTab; label: string}[] = [
      {id: "details", label: t("video.description.title")},
      {id: "comments", label: t("video.comments.title")},
    ];

    if (model.queue) {
      entries.push({id: "queue", label: t("video.queue.title")});
    }

    return entries;
  }, [model.queue, t]);

  if (!visible) {
    return null;
  }

  return (
    <TVFocusGuideView
      autoFocus
      style={[
        styles.panel,
        {
          backgroundColor: theme.colors.surface,
          padding: theme.spacing.lg,
          gap: theme.spacing.md,
        },
      ]}
      trapFocusDown
      trapFocusLeft
      trapFocusRight
      trapFocusUp>
      <View style={[styles.header, {gap: theme.spacing.md}]}>
        <AppText numberOfLines={2} style={styles.title} variant={"titleSmall"}>
          {model.title}
        </AppText>
        <AppIconButton
          accessibilityLabel={t("video.panel.close")}
          icon={"close"}
          onPress={onClose}
        />
      </View>
      <View style={[styles.tabs, {gap: theme.spacing.sm}]}>
        {tabs.map(entry => (
          <Chip
            key={entry.id}
            label={entry.label}
            onPress={() => onTabChange(entry.id)}
            selected={tab === entry.id}
          />
        ))}
      </View>
      <View style={styles.content}>
        {tab === "details" ? (
          <VideoDescriptionPanel description={model.description} />
        ) : tab === "comments" ? (
          <CommentList
            comments={comments.comments}
            error={comments.error}
            loading={comments.loading}
            loadingMore={comments.loadingMore}
            onEndReached={comments.fetchMore}
            onRetry={comments.retry}
          />
        ) : model.queue ? (
          <VideoQueuePanel entries={queueEntries} queue={model.queue} />
        ) : null}
      </View>
    </TVFocusGuideView>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: "absolute",
    top: 0,
    bottom: 0,
    end: 0,
    width: "36%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
  },
  title: {
    flex: 1,
  },
  tabs: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  content: {
    flex: 1,
  },
});
