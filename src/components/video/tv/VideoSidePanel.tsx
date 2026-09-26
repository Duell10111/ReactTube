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
import {useTVOverscanInsets} from "@/ui/tv";

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
 * Focus inside it is a matter of guides, not of traps: `trapFocus*` on the
 * panel kept the D-pad from ever reaching the close button, and `autoFocus`
 * on the panel spans a guide across the whole surface that competes with
 * every move made within it. Both are therefore left off here, and each row
 * of the panel head carries its own guide instead.
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
  const overscan = useTVOverscanInsets();

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
      style={[
        styles.panel,
        {
          backgroundColor: theme.colors.surface,
          padding: theme.spacing.lg,
          // The panel sits at the trailing screen edge, so its own padding is
          // not enough: the close button would land inside the crop.
          paddingTop: theme.spacing.lg + overscan.top,
          paddingBottom: theme.spacing.lg + overscan.bottom,
          paddingEnd: theme.spacing.lg + overscan.right,
          gap: theme.spacing.md,
        },
      ]}>
      {/*
       * The close button sits at the right edge, the tabs at the left, and
       * tvOS moves focus geometrically: Up from a tab looks at the empty
       * space beside the title and finds nothing there. Each row is a focus
       * guide of its own, so a move that lands anywhere in the row is handed
       * to the button it holds — and the row remembers which one that was.
       */}
      <TVFocusGuideView
        autoFocus
        style={[styles.header, {gap: theme.spacing.md}]}>
        <AppText numberOfLines={2} style={styles.title} variant={"titleSmall"}>
          {model.title}
        </AppText>
        <AppIconButton
          accessibilityLabel={t("video.panel.close")}
          focusable
          hasTVPreferredFocus
          icon={"close"}
          onPress={onClose}
        />
      </TVFocusGuideView>
      <TVFocusGuideView
        autoFocus
        style={[styles.tabs, {gap: theme.spacing.sm}]}>
        {tabs.map(entry => (
          <Chip
            key={entry.id}
            label={entry.label}
            onPress={() => onTabChange(entry.id)}
            selected={tab === entry.id}
          />
        ))}
      </TVFocusGuideView>
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
    minHeight: 0,
    overflow: "hidden",
  },
});
