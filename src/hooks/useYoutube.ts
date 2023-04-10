import {useEffect, useState} from "react";
import YoutubeExtractor from "../utils/Youtube";

export default function useYoutube() {
  const [youtube, setYoutube] = useState<YoutubeExtractor>();

  useEffect(() => {
    // console.log(YoutubeExtractor);
    // YoutubeExtractor.create({}).then(setYoutube).catch(console.warn);
  }, []);

  return youtube;
}
