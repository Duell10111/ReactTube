import _ from "lodash";
import Crypto from "react-native-quick-crypto";

import {getVideoData} from "./ElementData";
import {extractKeyNode} from "./KeyExtraction";
import {ElementData, Thumbnail} from "./Types";
import Logger from "../utils/Logger";
import {Helpers, YTNodes} from "../utils/Youtube";

import {getThumbnail} from "@/extraction/Misc";

const LOGGER = Logger.extend("SHELF-EXTRACTION");

const firstRows = 2;

const videoItems = ["RichItem", "Video"];
const sectionItems = ["RichSection", "Shelf", "ReelShelf", "ItemSection"];

export interface HorizontalData {
  originalNode: Helpers.YTNode;
  data: Helpers.YTNode[];
  parsedData: ElementData[];
  loadMore: () => void;
  id: string;
  title?: string;
  subtitle?: string;
  items_per_columns?: number;
  shelf?: boolean; // Needed?
  music?: boolean;
  thumbnail?: Thumbnail;
  buttons?: HorizontalDataButton[];
  on_tab?: YTNodes.NavigationEndpoint;
}

export interface HorizontalDataButton {
  type: "PLAY" | "PLAYLIST_ADD";
  title?: string;
  endpoint?: YTNodes.NavigationEndpoint;
}

// TODO: deprecate remove?
export function gridCalculatorExtract(
  content: Helpers.YTNode,
  columns: number,
) {
  return gridCalculator(extractListContent(content), columns);
}

// TODO: deprecate?
export function gridCalculator(
  content: Helpers.YTNode[],
  columns: number,
): (ElementData[] | HorizontalData)[] {
  // console.log("TypesArr: ", listPrintTypes(content));

  const groups = _.groupBy(content, node => node.type);

  const types = Object.keys(groups);
  // console.log("Types: ", types);

  const sectionsAvailable = _.intersection(types, sectionItems);

  if (sectionsAvailable.length > 0) {
    const items = _.chain(videoItems)
      .intersection(types)
      .map(type => (type ? groups[type] : []))
      .flatten()
      .map(getVideoData)
      .compact()
      .value();
    const sectionsItems = _.chain(sectionItems)
      .intersection(types)
      .map(type => (type ? groups[type] : []))
      .flatten()
      .map(parseHorizontalNode)
      .compact()
      .value();

    const newArray = [];

    for (const sections of sectionsItems) {
      for (let i = 0; i < firstRows; i++) {
        // @ts-ignore
        newArray.push(items.splice(0, columns));
      }
      // @ts-ignore
      newArray.push(sections);
    }
    // @ts-ignore
    newArray.push(..._.chunk(items, columns));

    return newArray;
  } else {
    const list = _.chain(content)
      .map(element => getVideoData(element))
      .filter(v => v !== undefined)
      .chunk(columns)
      .value() as ElementData[][];

    // listPrint(list);

    return list;
  }
}

export function parseHorizontalNode(
  node: Helpers.YTNode,
  suppressedError?: boolean,
): HorizontalData | undefined {
  if (!node) {
    LOGGER.warn("FALSE TYPE PROVIDED!");
    return undefined;
  }
  if (node.is(YTNodes.Shelf)) {
    const {content, parsedData} = node.content
      ? extractContent(node.content)
      : {content: [], parsedData: []};
    return {
      data: content,
      parsedData,
      loadMore: () => {},
      id: extractKeyNode(node),
      originalNode: node,
      title: node.title.text,
    };
  } else if (node.is(YTNodes.ItemSection)) {
    const {content, parsedData} = extractContent(Array.from(node.contents));

    // TODO: Currently producing warnings in extractContent?
    // For Channel Homescreen
    if (content.length === 1 && parsedData.length === 0) {
      // console.log("Nested Shelf?");
      // console.log(node.header);
      return parseHorizontalNode(content[0]);
    }

    return {
      data: content,
      parsedData,
      loadMore: () => {},
      id: extractKeyNode(node),
      originalNode: node,
      title: node.header ? extractHeader(node.header) : undefined,
    };
  } else if (node.is(YTNodes.RichShelf, YTNodes.ReelShelf)) {
    const {content, parsedData} = extractContent(Array.from(node.contents));
    return {
      data: content,
      parsedData,
      loadMore: () => {},
      id: extractKeyNode(node),
      originalNode: node,
      title: node.title.text,
    };
  } else if (node.is(YTNodes.RichSection)) {
    return parseHorizontalNode(node.content);
  } else if (node.is(YTNodes.ReelShelf)) {
    const {content, parsedData} = extractContent(Array.from(node.contents));
    return {
      data: content,
      parsedData,
      loadMore: () => {},
      id: extractKeyNode(node),
      originalNode: node,
      title: node.title.text,
    };
  } else if (node.is(YTNodes.FeedNudge)) {
    //TODO: Add nudge type to horizontal type?
    return {
      data: [],
      parsedData: [],
      loadMore: () => {},
      id: node.title.text ?? "feed_nudge",
      title: node.title.text,
      originalNode: node,
    };
  }
  // Music types
  else if (node.is(YTNodes.MusicCarouselShelf)) {
    const {content, parsedData} = extractContent(Array.from(node.contents));
    return {
      data: content,
      parsedData,
      loadMore: () => {},
      id: node.header?.title?.text ?? Crypto.randomUUID(),
      title: node.header?.title?.text,
      items_per_columns: node.num_items_per_column,
      music: true,
      shelf: true,
      originalNode: node,
    };
  } else if (node.is(YTNodes.MusicDescriptionShelf)) {
    return {
      data: [],
      parsedData: [],
      loadMore: () => {},
      id: node.type, // TODO: Hash description?
      title: node.description.text,
      originalNode: node,
      music: true,
      shelf: true,
    };
  } else if (node.is(YTNodes.MusicShelf)) {
    const {content, parsedData} = extractContent(Array.from(node.contents));
    return {
      data: content,
      parsedData,
      loadMore: () => {},
      id: node.type + node.title.text, // TODO: Hash description?
      title: node.title.text,
      originalNode: node,
      music: true,
      shelf: true,
    };
  } else if (node.is(YTNodes.MusicCardShelf)) {
    // TODO: Handle case with no content - Only Play button
    const {content, parsedData} = node.contents
      ? extractContent(Array.from(node.contents))
      : {content: [], parsedData: []};
    return {
      data: content,
      parsedData,
      loadMore: () => {},
      id: node.type, // TODO: Hash description?
      title: node.title.text,
      subtitle: node.subtitle.text,
      originalNode: node,
      music: true,
      shelf: true,
      buttons: _.chain(node.buttons).map(extractButton).compact().value(),
      thumbnail: node.thumbnail
        ? getThumbnail(node.thumbnail.contents[0])
        : undefined,
      on_tab: node.on_tap,
    };
  } else if (!suppressedError) {
    console.warn("ShelfExtraction: Unknown horizontal type: ", node.type);
  }
}

function extractContent(node: Helpers.YTNode | Helpers.YTNode[]) {
  const content = Array.isArray(node) ? node : extractListContent(node);
  const parsedData = _.chain(content)
    .map(element => getVideoData(element))
    .compact()
    .value();
  return {
    content,
    parsedData,
  };
}

function extractListContent(node: Helpers.YTNode): Helpers.YTNode[] {
  if (
    node.is(YTNodes.VerticalList, YTNodes.HorizontalList, YTNodes.ReelShelf)
  ) {
    return Array.from(node.contents.values());
  } else if (node.is(YTNodes.Shelf)) {
    return node.content ? extractListContent(node.content) : [];
  } else if (node.is(YTNodes.Grid)) {
    // TODO: Replace by allowing to return multiple Horizontal Data's for nested Grids
    return Array.from(node.contents.values());
  } else if (node.is(YTNodes.ExpandedShelfContents)) {
    return Array.from(node.contents.values());
  } else {
    LOGGER.warn("Unknown ListContent extraction type: ", node.type);
  }
  return [];
}

function extractHeader(node: Helpers.YTNode) {
  if (node.is(YTNodes.ItemSectionHeader)) {
    return node.title.toString();
  } else {
    LOGGER.warn("Unknown Header type: ", node.type);
  }
}

function extractButton(node: Helpers.YTNode) {
  if (node.is(YTNodes.Button)) {
    let type: HorizontalDataButton["type"] | undefined = undefined;
    switch (node.icon_type) {
      case "PLAY_ARROW":
        type = "PLAY";
        break;
      // case "PLAYLIST_ADD":
      //   type = "PLAYLIST_ADD";
      //   break;
    }

    // Only return if an icon type is supported
    if (type) {
      return {
        type,
        title: node.text,
        endpoint: node.endpoint,
      } as HorizontalDataButton;
    } else {
      LOGGER.warn("Unknown Button icon type: ", node.icon_type);
    }
  } else {
    LOGGER.warn("Unknown Button type: ", node.type);
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
