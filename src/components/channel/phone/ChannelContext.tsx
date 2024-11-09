import React, {createContext, useContext} from "react";

import {YTChannel} from "@/extraction/Types";

interface ChannelContextType {
  channel: YTChannel;
}

// @ts-ignore Should never be the case
const ChannelCTX = createContext<ChannelContextType>({});

interface ChannelContextProps {
  channel: YTChannel;
  children: React.ReactElement;
}

export function ChannelContext({channel, children}: ChannelContextProps) {
  return <ChannelCTX.Provider value={{channel}} children={children} />;
}

export function useChannelContext() {
  return useContext(ChannelCTX);
}
