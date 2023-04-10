import {useEffect, useState} from "react";
import {Innertube} from "../utils/Youtube";

export default function useYoutube() {
  const [youtube, setYoutube] = useState<Innertube>();

  useEffect(() => {
    // console.log(YoutubeExtractor);
    Innertube.create({}).then(setYoutube).catch(console.warn);
  }, []);

  return youtube;
}
