import {useCallback, useEffect, useState} from "react";
import {useYoutubeContext} from "../context/YoutubeContext";

const minElements = 8;

export default function useHomeScreen() {
  const youtube = useYoutubeContext();
  const [homePage, setHomePage] = useState<HomeFeed>();

  useEffect(() => {
    if (youtube) {
      youtube
        .getHomeFeed()
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
    const nextContent = await homePage.getContinuation();
    setHomePage(nextContent);
  }, [homePage]);

  // useEffect(() => {
  //   if (homePage? && homePage?.segments.length < minElements) {
  //     fetchMore().catch(console.warn);
  //   }
  // }, [homePage, fetchMore]);

  // console.log(JSON.stringify(homePage?.contents, null, 4));

  return {homePage, content: homePage?.contents, fetchMore};
}
