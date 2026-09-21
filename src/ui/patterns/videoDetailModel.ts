import type {Translate} from "./mediaCardModel.ts";

import type {YTVideoInfo} from "@/extraction/Types";
import type {TranslationKey} from "@/localization/en";

export type VideoActionId =
  | "like"
  | "dislike"
  | "save"
  | "download"
  | "description"
  | "comments"
  | "queue";

export interface VideoDetailAction {
  id: VideoActionId;
  label: string;
  /** Material icon name, so every surface renders the same action mark. */
  icon: string;
  /** The action reflects a state the user has set, such as a rating. */
  active: boolean;
  accessibilityLabel: string;
}

export interface VideoDetailQueue {
  title: string;
  total: number;
  /** Zero-based index of the entry that is playing. */
  currentIndex: number;
  /** "3 of 24", already translated. */
  positionLabel: string;
}

export interface VideoDetailViewModel {
  id: string;
  title: string;
  /** Ordered metadata parts: views first, then the publish date. */
  metadata: string[];
  metadataLine: string;
  channel?: {id?: string; name: string};
  subscribed: boolean;
  description?: string;
  hasDescription: boolean;
  /** Set only when the video reports a comment count. */
  commentCount?: string;
  queue?: VideoDetailQueue;
  actions: VideoDetailAction[];
  accessibilityLabel: string;
}

export interface VideoDetailOptions {
  translate: Translate;
  /** Rating as the action endpoints report it, which can lag the video info. */
  liked?: boolean;
  disliked?: boolean;
  /** Downloads exist on touch surfaces only. */
  canDownload?: boolean;
  /** Comments are unreachable on some surfaces, so the action is left out. */
  canOpenComments?: boolean;
}

const metadataSeparator = " · ";

/** Material icon per action, as a plain string so this module stays UI-free. */
const actionIcons: Record<VideoActionId, string> = {
  like: "thumb-up",
  dislike: "thumb-down",
  save: "playlist-add",
  download: "download",
  description: "notes",
  comments: "comment",
  queue: "playlist-play",
};

const actionLabelKeys = {
  like: "video.action.like",
  dislike: "video.action.dislike",
  save: "video.action.save",
  download: "video.action.download",
  description: "video.action.description",
  comments: "video.action.comments",
  queue: "video.action.queue",
} as const satisfies Record<VideoActionId, TranslationKey>;

export function getVideoDetailMetadata(info: {
  short_views?: string;
  publishDate?: string;
}): string[] {
  return [info.short_views, info.publishDate].filter(
    (part): part is string => Boolean(part) && part !== "",
  );
}

function buildQueue(
  info: YTVideoInfo,
  translate: Translate,
): VideoDetailQueue | undefined {
  const playlist = info.playlist;

  if (!playlist || playlist.content.length === 0) {
    return undefined;
  }

  // A playlist can report an index outside its own content, which would
  // otherwise render "0 of 24" or a position past the end.
  const currentIndex = Math.min(
    Math.max(playlist.current_index, 0),
    playlist.content.length - 1,
  );

  return {
    title: playlist.title,
    total: playlist.content.length,
    currentIndex,
    positionLabel: translate("video.queue.position", {
      index: currentIndex + 1,
      total: playlist.content.length,
    }),
  };
}

/**
 * The typed view every video detail surface renders. It decides which actions
 * exist, what they are called, and how the metadata reads, so phone, tablet,
 * and TV cannot drift apart the way their two metadata blocks did before.
 */
export function createVideoDetailViewModel(
  info: YTVideoInfo,
  options: VideoDetailOptions,
): VideoDetailViewModel {
  const {translate, liked, disliked, canDownload, canOpenComments} = options;
  const metadata = getVideoDetailMetadata(info);
  const description = info.description?.trim() ? info.description : undefined;
  const queue = buildQueue(info, translate);
  const isLiked = liked ?? info.liked ?? false;
  const isDisliked = disliked ?? info.disliked ?? false;

  const actionStates: {id: VideoActionId; active: boolean}[] = [
    {id: "like", active: isLiked},
    {id: "dislike", active: isDisliked},
    {id: "save", active: false},
    ...(canDownload ? [{id: "download" as const, active: false}] : []),
    {id: "description", active: false},
    ...(canOpenComments ? [{id: "comments" as const, active: false}] : []),
    ...(queue ? [{id: "queue" as const, active: false}] : []),
  ];

  const actions: VideoDetailAction[] = actionStates.map(action => {
    const label = translate(actionLabelKeys[action.id]);

    return {
      ...action,
      label,
      icon: actionIcons[action.id],
      accessibilityLabel: label,
    };
  });

  const channelName = info.channel?.name ?? info.author?.name;

  return {
    id: info.id,
    title: info.title,
    metadata,
    metadataLine: metadata.join(metadataSeparator),
    channel: channelName
      ? {id: info.channel_id ?? info.channel?.id, name: channelName}
      : undefined,
    subscribed: info.subscribed ?? false,
    description,
    hasDescription: description !== undefined,
    commentCount: info.commentsEntryPointHeader?.comments_count,
    queue,
    actions,
    accessibilityLabel: [info.title, channelName, ...metadata]
      .filter(Boolean)
      .join(metadataSeparator),
  };
}
