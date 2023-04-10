import React, {createContext, useContext} from "react";
import Youtube from "../utils/Youtube";

const Context = createContext<Youtube | undefined>(undefined);

interface Props {
  children: React.ReactNode;
}

export default function YoutubeContextProvider({children}: Props) {
  // const youtube = useYoutube();

  return <Context.Provider value={undefined}>{children}</Context.Provider>;
}

export function useYoutubeContext() {
  return useContext(Context);
}
