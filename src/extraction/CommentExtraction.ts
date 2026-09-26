import {getThumbnail} from "./Misc";
import {YTComment} from "./Types";

import {YT} from "@/utils/Youtube";

type CommentThread = YT.Comments["contents"][number];

/**
 * Turns one comment thread into the flat shape the UI renders. Replies stay
 * out: the panels show top-level comments, and a thread loads its replies on
 * demand through youtubei.js itself.
 */
export function parseCommentThread(
  thread: CommentThread,
): YTComment | undefined {
  const comment = thread.comment;

  if (!comment) {
    return undefined;
  }

  const thumbnail = comment.author?.thumbnails?.[0];

  return {
    id: comment.comment_id,
    text: comment.content?.text ?? "",
    author: comment.author
      ? {
          id: comment.author.id,
          name: comment.author.name,
          thumbnail: thumbnail ? getThumbnail(thumbnail) : undefined,
        }
      : undefined,
    publishedTime: comment.published_time,
    likeCount: comment.like_count,
    replyCount: comment.reply_count,
    pinned: comment.is_pinned,
    channelOwner: comment.author_is_channel_owner ?? false,
  };
}

/**
 * Whether anything of the comment survived parsing.
 *
 * YouTube does not put text and author into the comment node any more: both
 * arrive in `frameworkUpdates.entityBatchUpdate`, and youtubei.js merges them
 * afterwards. A response that carries the nodes without that batch parses
 * into comments that hold an id and nothing else. Rendered, that is a panel
 * of empty boxes — which is how the bug showed itself: the comments
 * "loaded", and the panel stayed black.
 */
export function isReadableComment(comment: YTComment): boolean {
  return comment.text.trim().length > 0 || Boolean(comment.author?.name);
}

export function parseComments(comments: YT.Comments): YTComment[] {
  return comments.contents
    .map(parseCommentThread)
    .filter((comment): comment is YTComment => comment !== undefined)
    .filter(isReadableComment);
}
