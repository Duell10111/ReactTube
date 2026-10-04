import {useCallback, useEffect, useRef, useState} from "react";

import Logger from "../../utils/Logger";

import {useYoutubeTVContext} from "@/context/YoutubeContext";
import {useTranslation} from "@/localization";
import {useSettings} from "@/utils/SettingsWrapper";
import {showMessage} from "@/utils/ShowFlashMessageHelper";
import {Innertube} from "@/utils/Youtube";
import {
  parseAccountChannels,
  type AccountChannel,
} from "@/utils/accountChannels";

const accountKey = "accountData";

interface AccountCredentials {
  access_token: string;
  refresh_token: string;
  expires: number;
}

interface Account {
  credentials?: AccountCredentials;
}

/** The brand channel the signed-in primary account acts as. */
interface ActiveChannel {
  pageId: string;
  name: string;
}

interface AccountData {
  accounts: Account[];
  /**
   * Kept beside `accounts` on purpose: token refreshes rewrite `accounts`,
   * and the settings store merges only the top level.
   */
  activeChannel?: ActiveChannel;
}

interface LoginData {
  verification_url: string;
  user_code: string;
  device_code: string;
}

/** Shape of the tokens youtubei.js hands out with its auth events. */
interface SessionCredentials {
  access_token: string;
  refresh_token: string;
  expiry_date: string;
}

const LOGGER = Logger.extend("ACCOUNT");

/**
 * Makes every following request of the session act as the brand channel
 * `pageId`, or as the account itself without one. Takes effect at once on the
 * live session (see `accountChannels.ts`).
 */
function applyChannel(youtube: Innertube, pageId?: string) {
  if (pageId) {
    youtube.session.context.user.onBehalfOfUser = pageId;
  } else {
    delete youtube.session.context.user.onBehalfOfUser;
  }
}

// TODO: Rewrite login mechanism and make faster!

function toStoredCredentials(
  credentials: SessionCredentials,
): AccountCredentials {
  return {
    access_token: credentials.access_token,
    refresh_token: credentials.refresh_token,
    expires: Date.parse(credentials.expiry_date),
  };
}

export default function useAccountData() {
  const {t} = useTranslation();
  const translationRef = useRef(t);
  translationRef.current = t;
  const {settings, updateSettings, clearAll} = useSettings<AccountData>(
    accountKey,
    {
      accounts: [],
    },
  );
  const [qrCode, setQRCodeData] = useState<LoginData>();
  const [channels, setChannels] = useState<AccountChannel[]>();
  const [channelsLoading, setChannelsLoading] = useState(false);
  const [channelsError, setChannelsError] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [autoLoginFinished, setAutoLoginFinished] = useState(false);

  // Use TV Context for OAuth2 Login !!!
  const youtube = useYoutubeTVContext();

  // Register listener for auth events
  useEffect(() => {
    if (!youtube) {
      LOGGER.debug("No Youtube Context available");
      return;
    }

    LOGGER.debug("Logged in: ", youtube.session.logged_in);

    const onAuthPending = (data: LoginData) => {
      // data.verification_url contains the URL to visit to authenticate.
      // data.user_code contains the code to enter on the website.
      const loginData: LoginData = {
        user_code: data.user_code,
        device_code: data.device_code,
        // Append user code so that the user does not have to input the user code
        verification_url: `${data.verification_url}?user_code=${data.user_code}`,
      };
      LOGGER.debug("Auth Pending: " + JSON.stringify(data));
      setQRCodeData(loginData);
    };

    const onAuth = ({credentials}: {credentials: SessionCredentials}) => {
      // do something with the credentials, eg; save them in a database.
      LOGGER.info("Sign in successful");
      LOGGER.debug("Credentials: ", JSON.stringify(credentials));
      // A new sign-in may be a different account; its channels differ too.
      applyChannel(youtube, undefined);
      setChannels(undefined);
      updateSettings({
        accounts: [{credentials: toStoredCredentials(credentials)}],
        activeChannel: undefined,
      });
      setQRCodeData(undefined);
      showMessage({
        type: "success",
        message: translationRef.current("login.success"),
      });
    };

    // 'update-credentials' is fired when the access token expires, if you do not save the updated credentials any subsequent request will fail
    const onUpdateCredentials = ({
      credentials,
    }: {
      credentials: SessionCredentials;
    }) => {
      // do something with the updated credentials
      LOGGER.debug("Credentials update: " + JSON.stringify(credentials));
      updateSettings({
        accounts: [{credentials: toStoredCredentials(credentials)}],
      });
    };

    youtube.session.on("auth-pending", onAuthPending);
    youtube.session.on("auth", onAuth);
    youtube.session.on("update-credentials", onUpdateCredentials);

    return () => {
      // Without this the handlers stack up on every re-run of the effect, and
      // one token refresh would write the settings several times over.
      youtube.session.off("auth-pending", onAuthPending);
      youtube.session.off("auth", onAuth);
      youtube.session.off("update-credentials", onUpdateCredentials);
    };
  }, [updateSettings, youtube]);

  // Check for existing login
  useEffect(() => {
    if (!youtube) {
      LOGGER.debug("Skipping Auto Login! No Youtube Context available.");
      return;
    }
    const credentials = settings.accounts?.[0]?.credentials;
    // Before the sign-in, so not a single request goes out as the wrong
    // identity.
    applyChannel(youtube, settings.activeChannel?.pageId);
    if (youtube.session.logged_in || !credentials) {
      setAutoLoginFinished(true);
      return;
    }

    //TODO: Check if user wants to log in?
    LOGGER.debug("Account credentials available");

    let active = true;

    youtube.session
      .signIn({
        expiry_date: new Date(credentials.expires).toISOString(),
        refresh_token: credentials.refresh_token,
        access_token: credentials.access_token,
      })
      .then(() => {
        LOGGER.info("Successfully logged in");
        if (active) {
          setLoginSuccess(true);
        }
      })
      .catch(LOGGER.warn)
      // The flag gates the splash screen, so it may only flip once the session
      // really carries the credentials. Screens that read account data fetch
      // once on mount and would otherwise run against a session that is still
      // signed out.
      .finally(() => {
        if (active) {
          setAutoLoginFinished(true);
        }
      });

    return () => {
      active = false;
    };
  }, [youtube]);

  const login = () => {
    if (!youtube) {
      LOGGER.warn("No Youtube Context available!");
      return;
    }
    // TODO: Trigger Login Succeeded Event to react on it in Login Screen
    youtube.session
      .signIn()
      .then(() => LOGGER.debug("Login succeed"))
      .catch(console.warn);
    LOGGER.debug("Login triggered");
  };

  const logout = () => {
    if (!youtube) {
      LOGGER.warn("No Youtube Context available!");
      return;
    }
    applyChannel(youtube, undefined);
    setChannels(undefined);
    youtube.session
      .signOut()
      .then(() => {
        updateSettings({
          accounts: [], // Adapt when using multiple accounts
          activeChannel: undefined,
        });
        LOGGER.debug("Logout succeeded");
      })
      .catch(error => {
        LOGGER.warn(error);
        // TODO: Show error prompt?
        // Delete to allow new login
        updateSettings({
          accounts: [], // Adapt when using multiple accounts
          activeChannel: undefined,
        });
      });
    LOGGER.debug("Logout triggered");
  };

  /** Fetches the account's channels; the TV client accepts the TV token. */
  const loadChannels = useCallback(async () => {
    if (!youtube?.session.logged_in) {
      setChannels(undefined);
      return;
    }

    setChannelsLoading(true);
    setChannelsError(false);

    try {
      const response = await youtube.actions.execute("/account/accounts_list", {
        client: "TV",
        parse: false,
        accountReadMask: {returnOwner: true, returnBrandAccounts: true},
      });
      setChannels(parseAccountChannels(response.data));
    } catch (error) {
      LOGGER.warn("Loading the account's channels failed: ", error);
      setChannelsError(true);
    } finally {
      setChannelsLoading(false);
    }
  }, [youtube]);

  /** Acts as `channel` from now on; the primary account has no `pageId`. */
  const selectChannel = useCallback(
    (channel: AccountChannel) => {
      if (!youtube) {
        return;
      }

      applyChannel(youtube, channel.pageId);
      updateSettings({
        activeChannel: channel.pageId
          ? {pageId: channel.pageId, name: channel.name}
          : undefined,
      });
      setChannels(current =>
        current?.map(entry => ({
          ...entry,
          selected: entry.pageId === channel.pageId,
        })),
      );
      LOGGER.info(
        `Acting as ${channel.pageId ? "brand channel" : "primary account"}`,
      );
    },
    [updateSettings, youtube],
  );

  return {
    login,
    logout,
    channels,
    channelsLoading,
    channelsError,
    loadChannels,
    selectChannel,
    activeChannelName: settings.activeChannel?.name,
    qrCode,
    loginData: settings,
    clearAllData: clearAll,
    loginSuccess,
    autoLoginFinished,
  };
}
