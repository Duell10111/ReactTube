import React from "react";

import {
  unavailableWatchLibrary,
  type WatchLibraryContextValue,
} from "./watchLibraryTypes";

// Apple TV has no WatchConnectivity, so the TV build always uses the stub.

export function WatchLibraryProvider({children}: {children: React.ReactNode}) {
  return <>{children}</>;
}

export function useWatchLibrary(): WatchLibraryContextValue {
  return unavailableWatchLibrary;
}
