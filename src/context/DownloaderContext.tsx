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

export interface WatchFileTransferInfo {
  uri: string;
  process: number;
  transferring: boolean;
  paused: boolean;
}

interface DownloaderContextValue {
  currentDownloads: MutableRefObject<DownloadRef>;
  // TODO: Migrate to ref as downloads as well?
  currentUploads: WatchFileTransferInfo[];
  download: (id: string) => Promise<void>;
  uploadToWatch: (id: string) => void;
  sendPlaylistToWatch: (id: string) => void;
}

// TODO: Create some placeholder functions that generate warnings
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

  const {watchTransfers, upload, sendPlaylist} = useWatchSync();

  return (
    <downloaderContext.Provider
      value={{
        download,
        currentDownloads: downloadRefs,
        currentUploads: watchTransfers,
        uploadToWatch: upload,
        sendPlaylistToWatch: sendPlaylist,
      }}
      children={children}
    />
  );
}

export function useDownloaderContext() {
  return useContext(downloaderContext);
}
