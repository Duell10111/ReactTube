import {YT} from "../../utils/Youtube";
import {useEffect, useState} from "react";
import RNFS from "react-native-fs";

const dashFolder = [RNFS.CachesDirectoryPath, "dash"].join("/");

// TODO: Allow selectors in Settings?

function bestAudioVideoFilter(videoInfo: YT.VideoInfo) {
  const video = videoInfo.chooseFormat({type: "video", quality: "best"});
  const audio = videoInfo.chooseFormat({type: "audio", quality: "best"});

  return (format: typeof video) => {
    if (format.itag === video.itag || format.itag === audio.itag) {
      console.log("Selected: ", format.quality + " " + format.audio_quality);
      return true;
    }
    return false;
  };
}

async function exportDashFile(videoInfo: YT.VideoInfo) {
  // Check for Cache file
  const folder = await RNFS.exists(dashFolder);
  if (!folder) {
    await RNFS.mkdir(dashFolder);
  }
  const filePath = [dashFolder, videoInfo.basic_info.id].join("/");
  const dashFileExists = await RNFS.exists(filePath);

  if (!dashFileExists) {
    const dashContent = await videoInfo.toDash(
      undefined,
      bestAudioVideoFilter(videoInfo),
    );
    await RNFS.writeFile(filePath, dashContent, "utf8");
  }
  return filePath;
}

export default function useYoutubeDash(videoInfo: YT.VideoInfo) {
  const [dashUrl, setDashUrl] = useState<string>();

  useEffect(() => {
    exportDashFile(videoInfo).then(setDashUrl).catch(console.warn);
  }, [videoInfo]);

  return {dashUrl};
}
