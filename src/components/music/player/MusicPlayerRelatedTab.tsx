import {useMusikPlayerContext} from "../../../context/MusicPlayerContext";
import useMusicRelatedInfo from "../../../hooks/music/useMusicRelatedInfo";

import {MediaFeed} from "@/ui/patterns";

export function MusicPlayerRelatedTab() {
  const {currentItem} = useMusikPlayerContext();
  const {relatedSections, message, loading, error} = useMusicRelatedInfo(
    currentItem?.id ?? "",
  );

  return (
    <MediaFeed
      emptyMessage={message}
      error={error}
      items={relatedSections ?? []}
      loading={loading}
      testID={"music-related-feed"}
    />
  );
}
