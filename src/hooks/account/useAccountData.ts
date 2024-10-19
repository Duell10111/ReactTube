import {useEffect, useState} from "react";

import Logger from "../../utils/Logger";

import {useYoutubeContext} from "@/context/YoutubeContext";
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

const LOGGER = Logger.extend("ACCOUNT");

// TODO: Rewrite login mechanism and make faster!

export default function useAccountData() {
  const {settings, updateSettings, clearAll} = useSettings<AccountData>(
    accountKey,
    {
      accounts: [],
    },
  );
  const [qrCode, setQRCodeData] = useState<LoginData>();
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [autoLoginFinished, setAutoLoginFinished] = useState(false);

  const youtube = useYoutubeContext();

  // Register listener for auth events
  useEffect(() => {
    if (!youtube) {
      LOGGER.debug("No Youtube Context available");
      return;
    }

    LOGGER.debug("Logged in: ", youtube.session.logged_in);

    youtube?.session.on("auth-pending", data => {
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
    });

    youtube.session.on("auth", ({credentials}) => {
      // do something with the credentials, eg; save them in a database.
      LOGGER.info("Sign in successful");
      LOGGER.debug("Credentials: ", JSON.stringify(credentials));
      const account: Account = {
        credentials: {
          access_token: credentials.access_token,
          refresh_token: credentials.refresh_token,
          expires: Date.parse(credentials.expiry_date),
        },
      };
      updateSettings({
        accounts: [account],
      });
      setQRCodeData(undefined);
      showMessage({
        type: "success",
        message: "Login successful",
      });
    });

    // 'update-credentials' is fired when the access token expires, if you do not save the updated credentials any subsequent request will fail
    youtube.session.on("update-credentials", ({credentials}) => {
      // do something with the updated credentials
      LOGGER.debug("Credentials update: " + JSON.stringify(credentials));
      const account: Account = {
        credentials: {
          access_token: credentials.access_token,
          refresh_token: credentials.refresh_token,
          expires: Date.parse(credentials.expiry_date),
        },
      };
      updateSettings({
        accounts: [account],
      });
    });
  }, [youtube]);

  // Check for existing login
  useEffect(() => {
    if (!youtube) {
      LOGGER.debug("Skipping Auto Login! No Youtube Context available.");
      return;
    }
    if (!youtube.session.logged_in && settings.accounts?.[0]?.credentials) {
      //TODO: Check if user wants to log in?

      LOGGER.debug("Account credentials available");
      const credentials = settings.accounts[0].credentials;
      youtube.session
        .signIn({
          expiry_date: new Date(credentials.expires).toISOString(),
          refresh_token: credentials.refresh_token,
          access_token: credentials.access_token,
        })
        .then(() => {
          LOGGER.info("Successfully logged in");
          setLoginSuccess(true);
        })
        .catch(LOGGER.warn);
    }
    setAutoLoginFinished(true);
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
