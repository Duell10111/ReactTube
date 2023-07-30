import {Helpers} from "../utils/Youtube";
import {getVideoData} from "./ElementData";
import _ from "lodash";

export function parseObservedArray(
  array: Helpers.ObservedArray<Helpers.YTNode>,
) {
  return _.chain(Array.from(array.values()))
    .map(getVideoData)
    .compact()
    .value();
}
