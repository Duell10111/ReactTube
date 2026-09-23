import {useEffect, useRef, useState} from "react";

import Logger from "../../utils/Logger";

import {useYoutubeTVContext} from "@/context/YoutubeContext";
import {useTranslation} from "@/localization";
import {useSettings} from "@/utils/SettingsWrapper";
import {showMessage} from "@/utils/ShowFlashMessageHelper";

const accountKey = "accountData";

interface AccountCredentials {
  access_token: string;
  refresh_token: string;
  expires: number;
}

interface Account {
  credentials?: AccountCredentials;
}

interface AccountData {
  accounts: Account[];
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
      updateSettings({
        accounts: [{credentials: toStoredCredentials(credentials)}],
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
    youtube.session
      .signOut()
      .then(() => {
        updateSettings({
          accounts: [], // Adapt when using multiple accounts
        });
        LOGGER.debug("Logout succeeded");
      })
      .catch(error => {
        LOGGER.warn(error);
        // TODO: Show error prompt?
        // Delete to allow new login
        updateSettings({
          accounts: [], // Adapt when using multiple accounts
        });
      });
    LOGGER.debug("Logout triggered");
  };

  return {
    login,
    logout,
    qrCode,
    loginData: settings,
    clearAllData: clearAll,
    loginSuccess,
    autoLoginFinished,
  };
}
