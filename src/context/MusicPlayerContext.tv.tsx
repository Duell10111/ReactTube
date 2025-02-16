import React from "react";

interface MusicPlayerProviderProps {
  children?: React.ReactNode;
}

export function MusicPlayerContext({children}: MusicPlayerProviderProps) {
  return <>{children}</>;
}

export function useMusikPlayerContext() {
  return {};
}
