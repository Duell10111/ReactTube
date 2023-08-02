import {useYoutubeContext} from "../context/YoutubeContext";
import {useEffect, useState} from "react";
import {getHLSFile} from "./extractor/hlsStorage";
import {del, get, getFilePath, save} from "./StorageFkts";

export default function useHLS(videoId: string) {
  const youtube = useYoutubeContext();
  const [url, setURL] = useState<string>();

  useEffect(() => {
    const fetchHLS = async () => {
      if (!youtube) {
        return;
      }
      await getHLSFile(
        videoId,
        "master.m3u8",
        {
          getFileLocally: get,
          saveFileLocally: save,
          deleteFolder: del,
        },
        youtube,
      );
      console.log("Fetched HLS File");
      setURL(getFilePath(videoId, "master.m3u8"));
    };

    if (youtube) {
      fetchHLS().catch(console.warn);
    }
  }, [videoId, youtube]);

  return url;
}
