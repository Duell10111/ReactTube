import {Helpers, YTNodes} from "../utils/Youtube";

import {parseObservedArray} from "@/extraction/ArrayExtraction";
import Logger from "@/utils/Logger";

const LOGGER = Logger.extend("EXTRACTION");

export function extractGrid(grid: Helpers.YTNode) {
  if (grid.is(YTNodes.Grid)) {
    return parseObservedArray(grid.contents);
  } else {
    LOGGER.warn("Unknown Grid Item: ", grid.type);
  }
}
