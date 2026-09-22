import type {YTVideoInfo, YTVideoInfoCommentEntryPointHeader} from "./Types";

interface VideoDetailFields {
  description?: string;
  commentsEntryPointHeader?: YTVideoInfoCommentEntryPointHeader;
}

/** Fills detail fields that the TV metadata response commonly omits. */
export function resolveVideoDetailFallback(
  primary: Pick<YTVideoInfo, "description" | "commentsEntryPointHeader">,
  fallback: Pick<YTVideoInfo, "description" | "commentsEntryPointHeader">,
): VideoDetailFields {
  return {
    description: primary.description?.trim()
      ? primary.description
      : fallback.description,
    commentsEntryPointHeader:
      primary.commentsEntryPointHeader ?? fallback.commentsEntryPointHeader,
  };
}
