import React from "react";

import {
  unavailableWatchLibrary,
  type WatchLibraryContextValue,
} from "./watchLibraryTypes";

// The watch library is only available on iOS phones; see WatchLibraryContext.ios.tsx.

export function WatchLibraryProvider({children}: {children: React.ReactNode}) {
  return <>{children}</>;
}

export function useWatchLibrary(): WatchLibraryContextValue {
  return unavailableWatchLibrary;
}
