import React, {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

import type {ElementData} from "@/extraction/Types";
import type {VideoDetailViewModel} from "@/ui/patterns";

export interface VideoSidePanelData {
  videoId: string;
  model: VideoDetailViewModel;
  queueEntries: ElementData[];
}

interface VideoSidePanelContextValue {
  data?: VideoSidePanelData;
  clear: () => void;
  prepare: (data: VideoSidePanelData) => void;
}

const Context = createContext<VideoSidePanelContextValue | undefined>(
  undefined,
);

interface VideoSidePanelProviderProps {
  children: ReactNode;
}

/** Keeps rich player data out of React Navigation's serializable route state. */
export function VideoSidePanelProvider({
  children,
}: VideoSidePanelProviderProps) {
  const [data, setData] = useState<VideoSidePanelData>();
  const clear = useCallback(() => setData(undefined), []);
  const prepare = useCallback((nextData: VideoSidePanelData) => {
    setData(nextData);
  }, []);
  const value = useMemo(() => ({data, clear, prepare}), [clear, data, prepare]);

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useVideoSidePanel() {
  const value = useContext(Context);

  if (!value) {
    throw new Error(
      "useVideoSidePanel must be used inside VideoSidePanelProvider",
    );
  }

  return value;
}
