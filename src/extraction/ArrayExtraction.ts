import _ from "lodash";

import {getVideoData} from "./ElementData";
import {HorizontalData, parseHorizontalNode} from "./ShelfExtraction";
import {Helpers} from "../utils/Youtube";

export function parseArrayHorizontalAndElement(array: Helpers.YTNode[]) {
  return _.chain(array)
    .map(element => {
      const horizontalData = parseHorizontalNode(element, true);
      if (horizontalData) {
        return horizontalData;
      }
      const videoData = getVideoData(element, true);
      if (!videoData) {
        console.warn(
          "Error no Horizontal or VideoData element found: ",
          element.type,
        );
      }
      return videoData;
    })
    .compact()
    .value();
}

export function parseArray(array: Helpers.YTNode[]) {
  return _.chain(array)
    .map(element => getVideoData(element))
    .compact()
    .value();
}

export function parseObservedArray(
  array: Helpers.ObservedArray<Helpers.YTNode>,
) {
  return _.chain(Array.from(array.values()))
    .map(element => getVideoData(element))
    .compact()
    .value();
}

export function parseObservedArrayHorizontalData(
  array: Helpers.ObservedArray<Helpers.YTNode>,
) {
  return _.chain(Array.from(array.values()))
    .map(element => parseHorizontalNode(element))
    .compact()
    .value();
}

export function parseArrayHorizontalData(array: Helpers.YTNode[]) {
  return _.chain(array)
    .map(element => parseHorizontalNode(element))
    .compact()
    .value();
}

export function parseObservedArrayHorizontalDataFlatMap(
  array: Helpers.ObservedArray<Helpers.YTNode>,
) {
  return _.chain(Array.from(array.values()))
    .map(parseHorizontalNode)
    .compact()
    .flatMap(v => {
      return v.data.map(parseHorizontalNode);
    })
    .compact()
    .value();
}
