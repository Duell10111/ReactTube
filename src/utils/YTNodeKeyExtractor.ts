import {YTNodes, Helpers} from "./Youtube";
import Logger from "./Logger";

const LOGGER = Logger.extend("YTNODE-KEYEXTRACTOR");

export function itemSectionExtractor(node: Helpers.YTNode): string {
  if (node.is(YTNodes.ItemSection)) {
    return node.contents
      ? itemSectionExtractor(node.contents[0])
      : "empty-item-section";
  } else if (node.is(YTNodes.Shelf)) {
    return node.title.text ?? "empty-title";
  } else if (node.is(YTNodes.ReelShelf)) {
    return node.title.text ?? "empty-title-reel";
  } else if (node.is(YTNodes.ChannelVideoPlayer)) {
    return node.id;
  } else {
    LOGGER.warn("No item section key found for :", node.type);
  }
  return "";
}
