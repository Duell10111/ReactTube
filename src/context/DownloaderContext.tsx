import {createContext, MutableRefObject, ReactNode, useContext} from "react";
import {Platform} from "react-native";

import {useMigration} from "../downloader/DownloadDatabaseOperations";
import useDownloadProcessor, {
  DownloadRef,
} from "../hooks/downloader/useDownloadProcessor";

interface DownloaderContextValue {
  currentDownloads: MutableRefObject<DownloadRef>;
  download: (id: string) => void;
}

const downloaderContext = createContext<DownloaderContextValue>({});

interface DownloaderContextProps {
  children: ReactNode;
}

export function DownloaderContext({children}: DownloaderContextProps) {
  if (Platform.isTV) {
    return <>{children}</>;
  }

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const {downloadRefs, download} = useDownloadProcessor();

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const {success, error} = useMigration();
  console.log("Success: ", success);
  console.log("Error: ", error);

  return (
    <downloaderContext.Provider
      value={{download, currentDownloads: downloadRefs}}
      children={children}
    />
  );
}

export function useDownloaderContext() {
  return useContext(downloaderContext);
}
