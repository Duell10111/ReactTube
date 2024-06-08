import {Text} from "react-native";

import {useVideos} from "../../downloader/DownloadDatabaseOperations.ios";

export function DownloadScreen() {
  const videos = useVideos();

  console.log(videos);

  return (
    <>
      <Text style={{color: "white"}}>{"Download Screen"}</Text>
      {videos.map(v => (
        <Text style={{color: "white"}}>{v.id}</Text>
      ))}
    </>
  );
}
