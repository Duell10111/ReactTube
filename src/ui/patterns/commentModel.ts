import type {Translate} from "./mediaCardModel.ts";

import type {YTComment} from "@/extraction/Types";

export interface CommentViewModel {
  id: string;
  authorName?: string;
  avatarUrl?: string;
  text: string;
  /** Publish time, likes, and replies as one line. */
  metadataLine: string;
  pinned: boolean;
  channelOwner: boolean;
  accessibilityLabel: string;
}

const separator = " · ";

export interface CommentModelOptions {
  translate: Translate;
}

/**
 * Comment as a panel renders it. YouTube already returns the counts formatted
 * ("1.2K"), so they are placed into a translated sentence instead of being
 * parsed and formatted again.
 */
export function createCommentViewModel(
  comment: YTComment,
  {translate}: CommentModelOptions,
): CommentViewModel {
  const metadata = [
    comment.publishedTime,
    comment.likeCount
      ? translate("video.comments.likes", {count: comment.likeCount})
      : undefined,
    comment.replyCount
      ? translate("video.comments.replies", {count: comment.replyCount})
      : undefined,
  ].filter((part): part is string => Boolean(part));

  const metadataLine = metadata.join(separator);

  return {
    id: comment.id,
    authorName: comment.author?.name,
    avatarUrl: comment.author?.thumbnail?.url,
    text: comment.text,
    metadataLine,
    pinned: comment.pinned,
    channelOwner: comment.channelOwner,
    accessibilityLabel: [
      comment.pinned ? translate("video.comments.pinned") : undefined,
      comment.author?.name,
      comment.text,
      metadataLine,
    ]
      .filter(Boolean)
      .join(separator),
  };
}
