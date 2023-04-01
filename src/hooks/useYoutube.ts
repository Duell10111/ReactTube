import {useEffect, useState} from "react";
import YoutubeExtractor from "../utils/Youtube";

export default function useYoutube() {
  const [youtube, setYoutube] = useState<YoutubeExtractor>();

  useEffect(() => {
    console.log(YoutubeExtractor);
    new YoutubeExtractor().init().then(y => {
      console.log("Init");
      setYoutube(y);
    });
  }, []);

  return youtube;
}
