import Crypto from "react-native-quick-crypto";

import Logger from "../utils/Logger";
import {Helpers, YTNodes} from "../utils/Youtube";

const LOGGER = Logger.extend("KEYEXTRACT");

export function extractKeyNode(node: Helpers.YTNode): string {
  if (
    node.is(
      YTNodes.CompactVideo,
      YTNodes.Video,
      YTNodes.Playlist,
      YTNodes.PlaylistVideo,
    )
  ) {
    return node.id;
  }
  // Recursive Array nodes
  else if (node.is(YTNodes.ItemSection, YTNodes.RichShelf)) {
    return node.type + node.contents.map(extractKeyNode).join("");
  } else if (node.is(YTNodes.Shelf)) {
    return node.title.text ?? `shelf-${Crypto.randomUUID()}`;
  } else if (node.is(YTNodes.ReelShelf)) {
    return (node.title.text ?? "empty-title-reel") + Crypto.randomUUID();
  } else if (node.is(YTNodes.RecognitionShelf)) {
    return node.title.text ?? "empty-title-recognition-shelf";
  } else if (node.is(YTNodes.ShortsLockupView)) {
    return node.entity_id;
  } else if (node.is(YTNodes.LockupView)) {
    // `content_id` fehlt bei manchen Lockups — der TV-Client schickt in der
    // Videobeschreibung eines ohne Id, das seine Playlist über die Metadaten
    // benennt. Der Titel ist dort der einzige stabile Schlüssel; eine UUID wäre
    // bei jedem Rendern neu und würde den Eintrag ständig neu aufbauen.
    return (
      node.content_id ??
      node.metadata?.title.toString() ??
      `lockup-${node.content_type ?? "untyped"}`
    );
  } else if (
    node.is(
      YTNodes.PlaylistVideoList,
      YTNodes.ReelItem,
      YTNodes.ChannelVideoPlayer,
    )
  ) {
    return node.id;
  } else if (node.is(YTNodes.RichItem)) {
    return extractKeyNode(node.content);
  } else {
    LOGGER.warn("Unknown extraction node type: ", node.type);
  }
  return "unknownType";
}
