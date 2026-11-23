import type {Translate} from "./mediaCardModel.ts";

import type {PlaylistPrivacy} from "@/extraction/playlistHeader";
import type {TranslationKey} from "@/localization/en";

export interface PlaylistHeroDetails {
  privacy?: PlaylistPrivacy;
  stats?: string[];
}

const privacyKeys: Record<PlaylistPrivacy, TranslationKey> = {
  private: "playlist.privacy.private",
  unlisted: "playlist.privacy.unlisted",
  public: "playlist.privacy.public",
};

/**
 * The line under a playlist's owner, e.g. "Playlist · Private · 45 videos ·
 * No views". The counts keep YouTube's own wording; only the kind and the
 * privacy come from the app's resources.
 */
export function getPlaylistMetadataLine(
  details: PlaylistHeroDetails,
  translate: Translate,
): string {
  const parts = [translate("playlist.kind")];

  if (details.privacy) {
    parts.push(translate(privacyKeys[details.privacy]));
  }

  for (const stat of details.stats ?? []) {
    const value = stat.trim();

    if (value) {
      parts.push(value);
    }
  }

  return parts.join(" · ");
}
