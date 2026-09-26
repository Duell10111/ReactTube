import {
  createContext,
  MutableRefObject,
  ReactNode,
  useContext,
  useEffect,
} from "react";

import DatabaseRecoveryComponent from "../components/general/DatabaseRecoveryComponent";
import LoadingComponent from "../components/general/LoadingComponent";
import useDownloadProcessor, {
  DownloadRef,
} from "../hooks/downloader/useDownloadProcessor";
// @ts-ignore Ignore atm as not relevant for Android
import useWatchSync from "../hooks/watchSync/useWatchSync";

import {useDatabaseMigration} from "@/downloader/DownloadDatabaseOperations";
import {useTranslation} from "@/localization";
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
  const {phase, success, error, diagnostics, recovered, retry, repair, reset} =
    useDatabaseMigration();

  if (phase === "failed" || phase === "repairing") {
    return (
      <DatabaseRecoveryComponent
        busy={phase === "repairing"}
        diagnostics={diagnostics}
        error={error}
        onRepair={repair}
        onReset={reset}
        onRetry={retry}
      />
    );
  }

  if (!success) {
    return <LoadingComponent />;
  }

  return (
    <InitializedDownloaderContext recovered={recovered}>
      {children}
    </InitializedDownloaderContext>
  );
}

function InitializedDownloaderContext({
  children,
  recovered,
}: DownloaderContextProps & {recovered: boolean}) {
  const {t} = useTranslation();
  const {downloadRefs, download} = useDownloadProcessor();

  useEffect(() => {
    if (recovered) {
      showMessage({type: "warning", message: t("database.recovered")});
    }
  }, [recovered, t]);

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
