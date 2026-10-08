import type {YTVideoInfo} from "./Types";

type VideoDetailFields = Pick<
  YTVideoInfo,
  | "description"
  | "commentsEntryPointHeader"
  | "short_views"
  | "publishDate"
  | "viewCount"
  | "publishedAt"
>;

/**
 * Fills detail fields that the TV metadata response commonly omits — for
 * shorts it often has no primary info at all, so neither views nor a date.
 */
export function resolveVideoDetailFallback(
  primary: Partial<VideoDetailFields>,
  fallback: Partial<VideoDetailFields>,
): Partial<VideoDetailFields> {
  return {
    description: primary.description?.trim()
      ? primary.description
      : fallback.description,
    commentsEntryPointHeader:
      primary.commentsEntryPointHeader ?? fallback.commentsEntryPointHeader,
    short_views: primary.short_views || fallback.short_views,
    publishDate: primary.publishDate || fallback.publishDate,
    viewCount: primary.viewCount ?? fallback.viewCount,
    publishedAt: primary.publishedAt ?? fallback.publishedAt,
  };
}
