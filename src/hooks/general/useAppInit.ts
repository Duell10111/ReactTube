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
    // `autoLoginFinished` has to stay in here: it is the flag the branch above
    // reads, and it flips only after the stored credentials have been applied
    // to both Innertube sessions.
  }, [
    youtube,
    account?.autoLoginFinished,
    account?.loginSuccess,
    account?.loginData,
  ]);

  return {init};
}
