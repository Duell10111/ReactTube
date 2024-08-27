import {parseObservedArrayHorizontalData} from "@/extraction/ArrayExtraction";
import Logger from "@/utils/Logger";
import {YTNodes, Helpers} from "@/utils/Youtube";

const LOGGER = Logger.extend("CUSTOM-LIST-EXTRACTION");

// SectionList Extraction

export function extractSectionList(node: Helpers.YTNode) {
  if (node.is(YTNodes.SectionList)) {
    return parseObservedArrayHorizontalData(node.contents);
  } else {
    LOGGER.warn("Unknown SectionList type: ", node.type);
  }
  return [];
}
