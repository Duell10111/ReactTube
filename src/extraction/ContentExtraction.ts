import {parseArrayHorizontalData} from "@/extraction/ArrayExtraction";
import {HorizontalData} from "@/extraction/ShelfExtraction";
import {YTNodes, Helpers} from "@/utils/Youtube";

interface ContentExtraction {
  grid?: boolean;
  items: HorizontalData[];
}

export function extractPageContent(content: Helpers.YTNode) {
  if (content.is(YTNodes.SectionList)) {
    return {
      grid: false,
      items: parseArrayHorizontalData(content.contents),
    } as ContentExtraction;
  } else if (content.is(YTNodes.RichGrid)) {
    return {
      grid: true,
      items: parseArrayHorizontalData(content.contents),
    } as ContentExtraction;
  } else {
    console.warn("Unknown PageContent type: ", content.type);
  }
}
