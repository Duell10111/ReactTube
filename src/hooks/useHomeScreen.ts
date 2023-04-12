import {useCallback, useEffect, useRef, useState} from "react";
import {useYoutubeContext} from "../context/YoutubeContext";
import {YT, Helpers, YTNodes} from "../utils/Youtube";
import Logger from "../utils/Logger";
import _ from "lodash";

const LOGGER = Logger.extend("HOOKS");

const minElements = 8;

export default function useHomeScreen() {
  const youtube = useYoutubeContext();
  const [homePage, setHomePage] = useState<YT.HomeFeed>();
  const [content, setContent] = useState<Helpers.YTNode[]>([]);

  useEffect(() => {
    if (youtube) {
      youtube
        .getHomeFeed()
        .then(value => {
          LOGGER.debug("Fetched HomeFeed");
          // console.log("Value: ", JSON.stringify(value, null, 2));
          setHomePage(value);
          if (value.contents.is(YTNodes.RichGrid)) {
            setContent(value.contents.contents);
          }
          console.log("Page Content: ", value.page_contents.type);
          console.log(
            "Page Content Size:",
            value.page_contents.as(YTNodes.RichGrid).contents.length,
          );
        })
        .catch(reason => {
          // console.log(JSON.stringify(reason));
          console.warn(reason);
        });
    }
  }, [youtube]);

  const fetchMore = useCallback(async () => {
    if (!homePage) {
      throw new Error("No Homepage available!");
    }
    if (!homePage.has_continuation) {
      throw new Error("No Continuation available!");
    }
    const nextContent = await homePage.getContinuation();
    // LOGGER.debug("Fetched Content: ", JSON.stringify(nextContent, null, 4));
    if (homePage.contents.type === "appendContinuationItemsAction") {
      LOGGER.debug("Append Item Fetched");
      if (nextContent.contents.contents) {
        console.log("Contents");
        const newValues = _.concat(content, nextContent.contents.contents);
        setContent(newValues);
      } else {
        LOGGER.warn("Continue content empty!");
      }
    } else {
      console.warn("Unknown Type: ", nextContent.contents.type);
    }
    setHomePage(nextContent);
  }, [homePage, content]);

  // useEffect(() => {
  //   if (homePage? && homePage?.segments.length < minElements) {
  //     fetchMore().catch(console.warn);
  //   }
  // }, [homePage, fetchMore]);

  // console.log(JSON.stringify(homePage?.contents, null, 4));

  console.log(content.length);

  return {homePage, content: content, fetchMore};
}
