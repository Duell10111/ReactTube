import CookieManager, {Cookies} from "@react-native-cookies/cookies";
import {Button} from "react-native-paper";
import WebView from "react-native-webview";

import useYoutubeCookies from "@/hooks/useYoutubeCookies";

export function LoginScreenCookies() {
  const cookieSettings = useYoutubeCookies();

  const extractCookies = async () => {
    CookieManager.get("https://www.youtube.com", true).then(cookies => {
      console.log("CookieManager.get from webkit-view =>", cookies);
      const extractedCookie = buildCookieString(cookies);
      console.log(extractedCookie);
      cookieSettings.updateSettings({
        cookie: extractedCookie,
      });
    });
  };

  const clearCookieValue = async () => {
    cookieSettings.clearAll();
  };

  console.log("Current Cookie: ", cookieSettings.settings.cookie);

  return (
    <>
      <WebView source={{uri: "https://youtube.com"}} sharedCookiesEnabled />
      <Button onPress={extractCookies}>{"Extract Cookie"}</Button>
    </>
  );
}

function buildCookieString(cookies: Cookies) {
  return Object.values(cookies)
    .map(cookie => `${cookie.name}=${cookie.value}`)
    .join("; ");
}
