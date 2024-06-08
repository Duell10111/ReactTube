import {createContext, ReactNode, useContext} from "react";
import {Platform} from "react-native";

import useDownloadProcessor from "../hooks/downloader/useDownloadProcessor";

interface DownloaderContextValue {
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
  const {download} = useDownloadProcessor();

  return <downloaderContext.Provider value={{download}} children={children} />;
}

export function useDownloaderContext() {
  return useContext(downloaderContext);
}
