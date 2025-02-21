import {useSettings} from "@/utils/SettingsWrapper";

interface CookiesData {
  cookie?: string;
}

export default function useYoutubeCookies() {
  return useSettings<CookiesData>("accCookie", {});
}
