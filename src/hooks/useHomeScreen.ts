import {useCallback, useEffect, useState} from "react";
import {genericPage} from "youtube-extractor/dist/src/types";
import {useYoutubeContext} from "../context/YoutubeContext";

const minElements = 8;

export default function useHomeScreen() {
  const youtube = useYoutubeContext();
  const [homePage, setHomePage] = useState<genericPage>();

  useEffect(() => {
    if (youtube) {
      youtube
        .getHomePage()
        .then(value => {
          // console.log("Value: ", JSON.stringify(value, null, 2));
          setHomePage(value);
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
    await homePage.continue();
  }, [homePage]);

  useEffect(() => {
    if (homePage?.segments && homePage?.segments.length < minElements) {
      fetchMore().catch(console.warn);
    }
  }, [homePage, fetchMore]);

  return {pageSegments: homePage?.segments, fetchMore};
}
