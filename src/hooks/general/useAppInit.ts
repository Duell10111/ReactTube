import {useMemo} from "react";

import {useAccountContext} from "@/context/AccountContext";
import {useYoutubeContext} from "@/context/YoutubeContext";

export default function useAppInit() {
  const account = useAccountContext();
  const youtube = useYoutubeContext();

  const init = useMemo(() => {
    const accountLoginReady =
      account?.loginData.accounts?.length === 0
        ? true
        : (account?.autoLoginFinished ?? false);

    // Wait for Innertube to initiate as this causes lags on JS thread
    return youtube && accountLoginReady;
  }, [youtube, account?.loginSuccess, account?.loginData]);

  return {init};
}
