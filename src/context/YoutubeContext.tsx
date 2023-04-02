import React, { createContext, useContext } from "react";
import Youtube from "../utils/Youtube";
import useYoutube from "../hooks/useYoutube";

const Context = createContext<Youtube | undefined>(undefined);

interface Props {
  children: React.ReactNode;
}

export default function YoutubeContextProvider({children}: Props) {
  const youtube = useYoutube();

  return <Context.Provider value={youtube}>{children}</Context.Provider>;
}

export function useYoutubeContext() {
  return useContext(Context);
}
