export interface RatingOverride {
  like?: boolean;
  dislike?: boolean;
}

export interface RatingState {
  liked?: boolean;
  disliked?: boolean;
}

export const LIKE_OVERRIDE: RatingOverride = {like: true, dislike: false};
export const DISLIKE_OVERRIDE: RatingOverride = {like: false, dislike: true};
export const NO_RATING_OVERRIDE: RatingOverride = {like: false, dislike: false};

/**
 * The rating to show: the optimistic override where one is set, otherwise
 * what YouTube reported. It returns new values instead of writing into the
 * video info, so dropping the override brings the reported rating back.
 */
export function resolveRating(
  reported: RatingState | undefined,
  override: RatingOverride,
): RatingState {
  return {
    liked: override.like ?? reported?.liked,
    disliked: override.dislike ?? reported?.disliked,
  };
}
