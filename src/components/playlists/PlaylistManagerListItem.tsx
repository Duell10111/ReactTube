import React from "react";

import {ElementData} from "@/extraction/Types";
import {MediaRow} from "@/ui/patterns";

interface PlaylistManagerListProps {
  data: ElementData;
  onPress?: () => void;
}

export function PlaylistManagerListItem({
  data,
  onPress,
}: PlaylistManagerListProps) {
  return <MediaRow element={data} onPress={onPress} />;
}
