import {useEffect, useRef, useState} from "react";

import {parseArrayHorizontalAndElement} from "@/extraction/ArrayExtraction";
import {HorizontalData} from "@/extraction/ShelfExtraction";
import {ElementData, YTLibrarySection} from "@/extraction/Types";
import {IBrowseResponse, Mixins, YT} from "@/utils/Youtube";

type LibrarySection = YT.Playlist | YT.History | Mixins.Feed<IBrowseResponse>;

export default function useLibrarySection(sectionData: YTLibrarySection) {
  const section = useRef<LibrarySection>(undefined);
  const [data, setData] = useState<(ElementData | HorizontalData)[]>(
    sectionData.content,
  );

  useEffect(() => {
    sectionData
      .getMoreData()
      .then(moreData => {
        section.current = moreData;
      })
      .catch(console.warn);
  }, [sectionData]);

  const fetchMore = () => {
    if (section.current?.has_continuation) {
      section.current.getContinuation().then(contData => {
        if (contData.page.contents) {
          setData([
            ...data,
            ...parseArrayHorizontalAndElement(contData.page.contents.array()),
          ]);
        } else {
          console.warn("No Library section continue content found!");
        }
      });
    }
  };

  return {
    data,
    fetchMore,
  };
}
