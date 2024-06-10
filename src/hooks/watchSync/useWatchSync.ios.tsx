import {
  watchEvents,
  sendMessage,
} from "@duell10111/react-native-watch-connectivity";
import {useEffect} from "react";

export default function useWatchSyncIos() {
  useEffect(() => {
    return watchEvents.addListener("message", (messageFromWatch, reply) => {
      console.log("Message from watch: ", messageFromWatch);
      if (messageFromWatch.type === "GetDownloads") {
        // handleDiaryUpdate(db, messageFromWatch)
        //   .catch(console.warn)
        //   .then(() => console.log("Handled watch data"));
      }
      // reply({text: 'Thanks watch!'})
    });
  }, []);
}
