import {useEffect, useRef, useState} from "react";

import {useYoutubeContext} from "../../context/YoutubeContext";
import {parseObservedArrayHorizontalData} from "../../extraction/ArrayExtraction";
import {HorizontalData} from "../../extraction/ShelfExtraction";
import {YTMusic} from "../../utils/Youtube";

export default function useMusicHome() {
  const homeData = useRef<YTMusic.HomeFeed>();
  const youtube = useYoutubeContext();
  const [data, setData] = useState<HorizontalData[]>();

  console.log(
    "Horizontal Data Types: ",
    data?.map(h => h.originalNode.type),
  );

  useEffect(() => {
    youtube.music.getHomeFeed().then(homeFeed => {
      homeData.current = homeFeed;
      setData(extractData(homeFeed));
    });
  }, []);

  const extractData = (homeFeed: YTMusic.HomeFeed) => {
    return parseObservedArrayHorizontalData(homeFeed.sections);
  };

  const fetchContinuation = () => {
    if (homeData.current.has_continuation) {
      homeData.current.getContinuation().then(home => {
        homeData.current = home;
        setData([...data, ...extractData(home)]);
      });
    }
  };

  return {
    data,
    fetchContinuation,
  };
}
