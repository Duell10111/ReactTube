import {
  createContext,
  MutableRefObject,
  ReactNode,
  useContext,
  useEffect,
} from "react";

import useDownloadProcessor, {
  DownloadRef,
} from "../hooks/downloader/useDownloadProcessor";
// @ts-ignore Ignore atm as not relevant for Android
import useWatchSync from "../hooks/watchSync/useWatchSync";

import {useMigration} from "@/downloader/DownloadDatabaseOperations";
import {showMessage} from "@/utils/ShowFlashMessageHelper";

interface DownloaderContextValue {
  currentDownloads: MutableRefObject<DownloadRef>;
  download: (id: string) => void;
  uploadToWatch: (id: string) => void;
}

// TODO: Create some placeholder functions that generate wornings
// @ts-ignore Ignore it atm
const downloaderContext = createContext<DownloaderContextValue>({});

interface DownloaderContextProps {
  children: ReactNode;
}

export function DownloaderContext({children}: DownloaderContextProps) {
  const {downloadRefs, download} = useDownloadProcessor();

  const {success, error} = useMigration();
  console.log("Success: ", success);
  console.log("Error: ", error);

  useEffect(() => {
    if (error !== undefined) {
      showMessage({
        type: "danger",
        message: "Local DB Migration failed!",
        description: "Try deleting and reinstalling your app",
      });
    }
  }, [error]);

  const {upload} = useWatchSync();

  return (
    <downloaderContext.Provider
      value={{download, currentDownloads: downloadRefs, uploadToWatch: upload}}
      children={children}
    />
  );
}

export function useDownloaderContext() {
  return useContext(downloaderContext);
}
