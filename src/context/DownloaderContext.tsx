import {createContext, MutableRefObject, ReactNode, useContext} from "react";

import ErrorComponent from "../components/general/ErrorComponent";
import LoadingComponent from "../components/general/LoadingComponent";
import useDownloadProcessor, {
  DownloadRef,
} from "../hooks/downloader/useDownloadProcessor";
// @ts-ignore Ignore atm as not relevant for Android
import useWatchSync from "../hooks/watchSync/useWatchSync";

import {useMigration} from "@/downloader/DownloadDatabaseOperations";

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
  const {success, error} = useMigration();

  if (error) {
    return (
      <ErrorComponent text={`Local DB migration failed: ${error.message}`} />
    );
  }

  if (!success) {
    return <LoadingComponent />;
  }

  return (
    <InitializedDownloaderContext>{children}</InitializedDownloaderContext>
  );
}

function InitializedDownloaderContext({children}: DownloaderContextProps) {
  const {downloadRefs, download} = useDownloadProcessor();

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
