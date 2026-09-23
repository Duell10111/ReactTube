import {useMusikPlayerContext} from "../../../context/MusicPlayerContext";
import useMusicRelatedInfo from "../../../hooks/music/useMusicRelatedInfo";

import {MusicSectionFeed} from "@/components/music/sections/MusicSectionFeed";

export function MusicPlayerRelatedTab() {
  const {currentItem} = useMusikPlayerContext();
  const {relatedSections, message, loading, error} = useMusicRelatedInfo(
    currentItem?.id ?? "",
  );

  return (
    <MusicSectionFeed
      emptyMessage={message}
      error={error}
      loading={loading}
      sections={relatedSections ?? []}
      testID={"music-related-feed"}
    />
  );
}
