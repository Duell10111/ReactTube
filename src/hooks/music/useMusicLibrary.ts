import {useEffect, useRef, useState} from "react";

import {useYoutubeContext} from "@/context/YoutubeContext";
import {
  parseObservedArray,
  parseObservedArrayHorizontalData,
} from "@/extraction/ArrayExtraction";
import {extractGrid} from "@/extraction/GridExtraction";
import {ElementData} from "@/extraction/Types";
import {YTMusic} from "@/utils/Youtube";

export default function useMusicLibrary() {
  const youtube = useYoutubeContext();
  const library = useRef<YTMusic.Library>();
  const continuation = useRef<YTMusic.LibraryContinuation>();
  const [data, setData] = useState<ElementData[]>();

  useEffect(() => {
    youtube.music.getLibrary().then(lib => {
      library.current = lib;
      console.log(lib.contents);
      // setData(extractData(lib));
      setData(extractGrid(lib.contents[0]));
    });
  }, []);

  const extractData = (homeFeed: YTMusic.Library) => {
    return parseObservedArrayHorizontalData(homeFeed.contents[0].contents);
  };

  const fetchContinuation = () => {
    const lib = continuation.current ?? library.current;
    if (lib.has_continuation) {
      lib.getContinuation().then(cont => {
        continuation.current = cont;
        console.log("Continure: ", cont);
        setData([...data, ...parseObservedArray(cont.contents.contents)]);
      });
    }
  };

  return {
    data,
    fetchContinuation,
  };
}
