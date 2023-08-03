import React, {createContext, useContext} from "react";
import useHLSServer from "./useHLSServer";

interface HLSServerContext {
  originURL?: string;
}

const context = createContext<HLSServerContext>({});

interface Props {
  children: React.ReactNode;
}

export default function HLSServerProvider({children}: Props) {
  const origin = useHLSServer();

  return (
    <context.Provider
      value={{
        originURL: origin,
      }}
      children={children}
    />
  );
}

export function useHLSServerContext() {
  return useContext(context);
}
