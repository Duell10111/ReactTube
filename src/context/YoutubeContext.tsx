import React, {createContext, useContext} from "react";

import useYoutube from "../hooks/useYoutube";

interface YoutubeContext {
  classicInnertube?: ReturnType<typeof useYoutube>;
  tvInnertube?: ReturnType<typeof useYoutube>;
}

const Context = createContext<YoutubeContext>({});

interface Props {
  children: React.ReactNode;
}

export default function YoutubeContextProvider({children}: Props) {
  const youtube = useYoutube();
  const tvInnertube = useYoutube();

  return (
    <Context.Provider
      value={{
        classicInnertube: youtube,
        tvInnertube,
      }}>
      {children}
    </Context.Provider>
  );
}

export function useYoutubeContext() {
  return useContext(Context).classicInnertube;
}

export function useYoutubeTVContext() {
  return useContext(Context).tvInnertube;
}
