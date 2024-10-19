import {StyleProp, ViewStyle} from "react-native";

import {MusicChannelCard} from "@/components/music/elements/MusicChannelCard";
import {MusicPlaylistCard} from "@/components/music/elements/MusicPlaylistCard";
import {MusicVideoCard} from "@/components/music/elements/MusicVideoCard";
import {ElementData} from "@/extraction/Types";

interface MusicElementCardProps {
  data: ElementData;
  style?: StyleProp<ViewStyle>;
}

export function MusicElementCard({data, style}: MusicElementCardProps) {
  if (data.type === "playlist" || data.type === "album") {
    return <MusicPlaylistCard data={data} style={style} />;
  } else if (data.type === "channel" || data.type === "artist") {
    return <MusicChannelCard data={data} style={style} />;
  } else if (data.type === "video") {
    return <MusicVideoCard data={data} style={style} />;
  }

  return null;
}
