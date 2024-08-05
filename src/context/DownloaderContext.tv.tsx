import {ReactNode} from "react";

interface DownloaderContextProps {
  children: ReactNode;
}

export function DownloaderContext({children}: DownloaderContextProps) {
  return <>{children}</>;
}

export function useDownloaderContext() {
  return {};
}
