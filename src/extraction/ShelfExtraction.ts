import {Helpers, YTNodes} from "../utils/Youtube";
import _ from "lodash";
import {getVideoData, VideoData} from "./VideoData";

const firstRows = 2;

const videoItems = ["RichItem", "Video"];
const sectionItems = ["RichSection", "Shelf", "ReelShelf", "ItemSection"];

export interface HorizontalData {
  originalNode: Helpers.YTNode;
  data: Helpers.YTNode[];
  loadMore: () => void;
  id: string;
  title?: string;
}

export function gridCalculatorExtract(
  content: Helpers.YTNode,
  columns: number,
) {
  return gridCalculator(extractListContent(content), columns);
}

export function gridCalculator(
  content: Helpers.YTNode[],
  columns: number,
): (VideoData[] | HorizontalData)[] {
  console.log("TypesArr: ", listPrintTypes(content));

  const groups = _.groupBy(content, node => node.type);

  const types = Object.keys(groups);
  console.log("Types: ", types);

  const sectionsAvailable = _.intersection(types, sectionItems);

  if (sectionsAvailable.length > 0) {
    console.log("Sections Found");
    const items = _.chain(videoItems)
      .intersection(types)
      .map(type => groups[type])
      .flatten()
      .map(getVideoData)
      .compact()
      .value();
    const sectionsItems = _.chain(sectionItems)
      .intersection(types)
      .map(type => groups[type])
      .flatten()
      .map(parseHorizontalNode)
      .compact()
      .value();

    const newArray = [];

    for (const sections of sectionsItems) {
      for (let i = 0; i < firstRows; i++) {
        newArray.push(items.splice(0, columns));
      }
      newArray.push(sections);
    }
    newArray.push(..._.chunk(items, columns));

    return newArray;
  } else {
    const list = _.chain(content)
      .map(getVideoData)
      .compact()
      .chunk(columns)
      .value();

    listPrint(list);

    return list;
  }
}

function parseHorizontalNode(node: Helpers.YTNode): HorizontalData | undefined {
  if (node.is(YTNodes.Shelf)) {
    return {
      data: node.content ? extractListContent(node.content) : [],
      loadMore: () => {},
      id: node.title + node.type,
      originalNode: node,
    };
  } else if (node.is(YTNodes.ItemSection)) {
    return {
      data: Array.from(node.contents.values()),
      loadMore: () => {},
      id: node.header + node.type,
      originalNode: node,
      title: extractHeader(node.header),
    };
  } else {
    console.warn("Unknown horizontal type: ", node.type);
  }
}

function extractListContent(node: Helpers.YTNode) {
  if (node.is(YTNodes.VerticalList)) {
    return Array.from(node.contents.values());
  }
  return [];
}

function extractHeader(node: Helpers.YTNode) {
  if (node.is(YTNodes.ItemSectionHeader)) {
    return node.title.toString();
  } else {
    console.warn("nknown Header type: ", node.type);
  }
}

function listPrint(v: any): any {
  if (Array.isArray(v)) {
    return v.map((v2: any) => listPrint(v2));
  }
  return v?.originalNode?.type;
}

function listPrintTypes(v: Helpers.YTNode | Helpers.YTNode[]): any {
  if (Array.isArray(v)) {
    return v.map((v2: any) => listPrintTypes(v2));
  }
  return v.type;
}
