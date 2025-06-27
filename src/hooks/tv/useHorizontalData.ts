import {useEffect, useRef, useState} from "react";
import {Helpers} from "youtubei.js";

import {useYoutubeTVContext} from "@/context/YoutubeContext";
import {parseObservedArray} from "@/extraction/ArrayExtraction";
import {HorizontalData} from "@/extraction/ShelfExtraction";
import {ElementData} from "@/extraction/Types";
import Logger from "@/utils/Logger";
import {HorizontalListContinuation, YTNodes} from "@/utils/Youtube";

const LOGGER = Logger.extend("HORIZONTAL_DATA");

export default function useHorizontalData(data: HorizontalData) {
  const [elements, setElements] = useState<ElementData[]>(data.parsedData);
  const continuation = useRef<HorizontalListContinuation>(undefined);
  const youtube = useYoutubeTVContext();

  useEffect(() => {
    // Reset elements if Horizontal Data changes
    setElements(data.parsedData);
  }, [data]);

  const fetchMore = () => {
    console.log("Fetching more data");

    let node: Helpers.YTNode | undefined = continuation.current;
    if (!node) {
      if (data.originalNode.is(YTNodes.Shelf) && data.originalNode.content) {
        node = data.originalNode.content;
      } else {
        LOGGER.debug(
          `Unknown horizontal continuation type: ${data.originalNode.type}`,
        );
      }
    }

    if (node) {
      youtube?.tv.fetchContinuationData(node).then(result => {
        if (result?.is(HorizontalListContinuation)) {
          continuation.current = result;
          setElements(existingElements => {
            if (result.items) {
              // Filter all existing items out to prevent issues
              const items = parseObservedArray(result.items).filter(
                item =>
                  existingElements.findIndex(i => i.id === item.id) === -1,
              );

              return [...existingElements, ...items];
            } else {
              LOGGER.warn("No elements found in Horizontal data continuation");
              return existingElements;
            }
          });
        }
      });
    } else {
      LOGGER.warn("No continuation node found");
    }
  };

  return {elements, fetchMore};
}
