import {useEffect, useRef, useState} from "react";

import {parseArrayHorizontalAndElement} from "@/extraction/ArrayExtraction";
import {HorizontalData} from "@/extraction/ShelfExtraction";
import {ElementData, YTLibrarySection} from "@/extraction/Types";
import {IBrowseResponse, Mixins, YT} from "@/utils/Youtube";

type LibrarySection = YT.Playlist | YT.History | Mixins.Feed<IBrowseResponse>;

export default function useLibrarySection(sectionData: YTLibrarySection) {
  const section = useRef<LibrarySection>();
  const [data, setData] = useState<(ElementData | HorizontalData)[]>(
    sectionData.content,
  );

  useEffect(() => {
    sectionData.getMoreData().then(moreData => {
      section.current = moreData;
    });
  }, [sectionData]);

  const fetchMore = () => {
    if (section.current?.has_continuation) {
      section.current.getContinuation().then(contData => {
        setData([
          ...data,
          ...parseArrayHorizontalAndElement(contData.page.contents.array()),
        ]);
      });
    }
  };

  return {
    data,
    fetchMore,
  };
}
