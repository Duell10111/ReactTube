import React, {createContext, useContext} from "react";

import useAccountData from "../hooks/account/useAccountData";

const accountContext = createContext<ReturnType<typeof useAccountData>>({
  loginSuccess: false,
  autoLoginFinished: false,
  loginData: {accounts: []},
  clearAllData: () => {},
  login: () => {},
  logout: () => {},
  qrCode: undefined,
});

interface Props {
  children: React.ReactNode;
}

export default function AccountContextProvider({children}: Props) {
  const account = useAccountData();

  return <accountContext.Provider children={children} value={account} />;
}

export function useAccountContext() {
  return useContext(accountContext);
}
