import {MaterialIcons} from "@expo/vector-icons";
import {BottomSheetFlatList} from "@gorhom/bottom-sheet";
import {Image} from "expo-image";
import React, {useCallback, useMemo, useState} from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type ListRenderItem,
} from "react-native";

import {createCommentViewModel} from "./commentModel";

import type {YTComment} from "@/extraction/Types";
import {useTranslation} from "@/localization";
import {AppText, EmptyState, ErrorState, Skeleton} from "@/ui/components";
import {useAppTheme} from "@/ui/theme";

const avatarSize = 36;
const skeletonCount = 4;

interface CommentListProps {
  comments: YTComment[];
  loading: boolean;
  loadingMore: boolean;
  error?: unknown;
  onRetry: () => void;
  onEndReached: () => void;
  /** Inside a bottom sheet the list has to be the sheet's own scrollable. */
  inSheet?: boolean;
}

/**
 * Comments with their own loading, empty, and error states. Shared by the
 * phone sheet and the TV side panel so both show the same entry and the same
 * failure text.
 */
export function CommentList({
  comments,
  loading,
  loadingMore,
  error,
  onRetry,
  onEndReached,
  inSheet = false,
}: CommentListProps) {
  const {theme} = useAppTheme();
  const {t} = useTranslation();

  const renderItem = useCallback<ListRenderItem<YTComment>>(
    ({item}) => <CommentRow comment={item} />,
    [],
  );

  if (loading) {
    return (
      <View
        accessibilityLabel={t("video.comments.loading")}
        accessibilityRole={"progressbar"}
        style={[
          styles.loading,
          {padding: theme.spacing.lg, gap: theme.spacing.lg},
        ]}>
        <ActivityIndicator color={theme.colors.textPrimary} size={"large"} />
        <AppText align={"center"} color={"textSecondary"}>
          {t("video.comments.loading")}
        </AppText>
        {Array.from({length: skeletonCount}).map((_, index) => (
          <View key={index} style={{gap: theme.spacing.sm}}>
            <Skeleton height={16} width={"40%"} />
            <Skeleton height={14} />
            <Skeleton height={14} width={"70%"} />
          </View>
        ))}
      </View>
    );
  }

  if (error) {
    return (
      <ErrorState
        message={t("video.comments.error.message")}
        onRetry={onRetry}
        title={t("video.comments.error.title")}
      />
    );
  }

  if (comments.length === 0) {
    return (
      <View style={styles.empty} testID={"comment-list-empty"}>
        <EmptyState
          message={t("video.comments.empty.message")}
          title={t("video.comments.empty.title")}
        />
      </View>
    );
  }

  if (Platform.isTV) {
    // A `FlatList` here rendered no cells at all inside the TV side panel —
    // the panel stayed empty while the same box showed the description fine.
    // Focus-driven scrolling mounts every row anyway, so the virtualized list
    // bought nothing and the plain scroll view is both the fix and less.
    return (
      <ScrollView
        contentContainerStyle={{
          padding: theme.spacing.lg,
          gap: theme.spacing.lg,
        }}
        onScroll={event => {
          const {contentOffset, contentSize, layoutMeasurement} =
            event.nativeEvent;
          const remaining =
            contentSize.height - contentOffset.y - layoutMeasurement.height;

          if (remaining < layoutMeasurement.height) {
            onEndReached();
          }
        }}
        scrollEventThrottle={64}
        style={styles.list}
        testID={"comment-list"}>
        {comments.map((comment, index) => (
          <CommentRow
            comment={comment}
            key={comment.id || `comment-${index}`}
          />
        ))}
        {loadingMore ? (
          <ActivityIndicator
            accessibilityLabel={t("video.comments.loading")}
            color={theme.colors.textSecondary}
            style={{padding: theme.spacing.lg}}
          />
        ) : null}
      </ScrollView>
    );
  }

  const List = inSheet ? BottomSheetFlatList : FlatList;

  return (
    <List
      ListFooterComponent={
        loadingMore ? (
          <ActivityIndicator
            accessibilityLabel={t("video.comments.loading")}
            color={theme.colors.textSecondary}
            style={{padding: theme.spacing.lg}}
          />
        ) : null
      }
      contentContainerStyle={{
        padding: theme.spacing.lg,
        gap: theme.spacing.lg,
        flexGrow: 1,
      }}
      data={comments}
      keyExtractor={(item: YTComment, index: number) =>
        // An id is expected, but a page that arrives without one must not
        // collapse every row onto the same key.
        item.id || `comment-${index}`
      }
      onEndReached={onEndReached}
      onEndReachedThreshold={0.6}
      renderItem={renderItem}
      style={styles.list}
      testID={"comment-list"}
    />
  );
}

interface CommentRowProps {
  comment: YTComment;
}

function CommentRow({comment}: CommentRowProps) {
  const {theme} = useAppTheme();
  const {t} = useTranslation();
  const [focused, setFocused] = useState(false);
  const model = useMemo(
    () => createCommentViewModel(comment, {translate: t}),
    [comment, t],
  );

  return (
    <View
      accessibilityLabel={model.accessibilityLabel}
      accessibilityRole={"text"}
      collapsable={false}
      focusable={Platform.isTV}
      onBlur={() => setFocused(false)}
      onFocus={() => setFocused(true)}
      style={[
        styles.row,
        {
          backgroundColor: focused
            ? theme.colors.surfacePressed
            : theme.colors.focusResting,
          borderColor: focused ? theme.colors.focus : theme.colors.focusResting,
          borderRadius: theme.radii.card,
          gap: theme.spacing.md,
          padding: Platform.isTV ? theme.spacing.sm : 0,
        },
      ]}>
      <Image
        accessibilityIgnoresInvertColors
        contentFit={"cover"}
        source={model.avatarUrl ? {uri: model.avatarUrl} : undefined}
        style={[styles.avatar, {backgroundColor: theme.colors.surfaceRaised}]}
      />
      <View style={[styles.content, {gap: theme.spacing.xs}]}>
        <View style={[styles.identity, {gap: theme.spacing.sm}]}>
          {model.pinned ? (
            <MaterialIcons
              color={theme.colors.textSecondary}
              name={"push-pin"}
              size={14}
            />
          ) : null}
          <AppText
            color={model.channelOwner ? "textPrimary" : "textSecondary"}
            numberOfLines={1}
            variant={"labelSmall"}>
            {model.authorName ?? ""}
          </AppText>
        </View>
        <AppText numberOfLines={12} variant={"bodySmall"}>
          {model.text}
        </AppText>
        {model.metadataLine ? (
          <AppText color={"textSecondary"} variant={"labelSmall"}>
            {model.metadataLine}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    flex: 1,
    justifyContent: "center",
  },
  loading: {
    flex: 1,
  },
  list: {
    flex: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderWidth: Platform.isTV ? 3 : 0,
  },
  content: {
    flex: 1,
  },
  identity: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: avatarSize,
    height: avatarSize,
    borderRadius: avatarSize / 2,
  },
});
