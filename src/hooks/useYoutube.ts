import {useEffect, useState} from "react";

import {useAppData} from "../context/AppDataContext";
import {parseLanguage} from "../utils/YTLanguages";
import {Innertube} from "../utils/Youtube";

import useYoutubeCookies from "@/hooks/useYoutubeCookies";
import Logger from "@/utils/Logger";

const visitorDataKey = "visitorDataYT";

const LOGGER = Logger.extend("INNERTUBE");

export default function useYoutube() {
  const [youtube, setYoutube] = useState<Innertube>();
  const {appSettings} = useAppData();
  const language = parseLanguage(appSettings);
  const cookieSettings = useYoutubeCookies();

  useEffect(() => {
    // let visitorData = Settings.get(visitorDataKey);
    // if (true) {
    //   visitorData = makeid(24);
    //   Settings.set({
    //     [visitorDataKey]: visitorData,
    //   });
    // }

    const cookie = cookieSettings.settings.cookie;

    console.log("cookie", cookie);

    Innertube.create({
      lang: language.key,
      cookie:
        "PREF=f6=40000000&tz=Europe.Berlin; __Secure-3PSIDTS=sidts-CjEBEJ3XVx0Qh6GFNVoVh7rCbreVVe_7cCVtQd-pBMvpaU9GapLxAJgp4b8aTu0dMAKqEAA; __Secure-3PAPISID=vpduXhQrksIErpt-/A495yqKIjbWSQOCzR; __Secure-3PSIDCC=AKEyXzXdnIgkJoJUdpY6DB9P0ASmQIJ3louIHUPbJHWqsH4tOys_gS_SFrDKbI3BmgvQOB1h; SAPISID=vpduXhQrksIErpt-/A495yqKIjbWSQOCzR; LOGIN_INFO=AFmmF2swRQIgQNU3ws9dMaPoLi8itN8kzU0P0PxBthMQCs-eqWWmSDwCIQCn1xelTYuFfPTKdOcN8IwLQKmKetvOKGwMvELViXM8HQ:QUQ3MjNmejY3bG5laXZhcldsTXg4aWp5ZmhwdDZkbkI3T1UzdWlpQzZ0QlZSWG5XUUlpME1lNU1fcVJnd3dnb2RZcGR4WW1tUjlQaTdFOFhEZWdEbDB1OXNyZ1RfQzhseHl0S2FRNzlJb3g0SGlZQnRZT1dld1ZHMEZ6U2ZhZFVGbjVxcms0dnZNTThUNkRNV29oTW9LLUs2ZmN0cU5LTEFFLUpTeWc0SWxORlpEckFfTGZmYTh2NlZ6dGd3U2NQdzFydkxnUlFKWkpEbjVXVFM1T1R0Z1Y0WlVMOE1oQlVRZw==; __Secure-1PAPISID=vpduXhQrksIErpt-/A495yqKIjbWSQOCzR; __Secure-3PSID=g.a000uAhTkLVkYWTTSyCdj_hJfA2XO4IFCY9-mwrsDqNO0YYhqhzVAlbZlBEm1HL6TEqL3FTn9QACgYKAd0SARMSFQHGX2MiFAVkrpMuTF-x50ylcCHucBoVAUF8yKq_SeA4gCcplCCwa6VVsvXa0076; VISITOR_PRIVACY_METADATA=CgJERRIEEgAgQQ%3D%3D; SID=g.a000uAhTkLVkYWTTSyCdj_hJfA2XO4IFCY9-mwrsDqNO0YYhqhzVNTSkw3Y2BUetkMotB8y1RgACgYKAV4SARMSFQHGX2Minya08JtBKov2kpztjevnNRoVAUF8yKova9lS_LIFvKFTmIf0-fLb0076; VISITOR_INFO1_LIVE=BtS02gIUOfY; SIDCC=AKEyXzV0mC_xIocJbBdH-wpkW5fZMm4Gb0d6iMIJXOcQOhpbLjaJrChAkJgRvSMdyz_X3Aqc; __Secure-1PSID=g.a000uAhTkLVkYWTTSyCdj_hJfA2XO4IFCY9-mwrsDqNO0YYhqhzVd0ka6hNRaYPMy0646VwRvgACgYKAW0SARMSFQHGX2MiG-rUlkD7U6UJoFWLP9cgoxoVAUF8yKpFJ9bbeQImJwPl4I0znxuM0076; SSID=ATC23DgojQhKi_fRP; __Secure-1PSIDCC=AKEyXzWOilRBVlKaZeSUPIuW5-Kd_gdpb-YXLuaVfDeZIPk5XISrXZuIUrBXpFiyC0II_t3l; YSC=MUz0MmALw7w; GPS=1; __Secure-ROLLOUT_TOKEN=CM7Pu_WKu6n0kwEQsa2Q3_XoigMYqvjso_rQiwM%3D; __Secure-1PSIDTS=sidts-CjEBEJ3XVx0Qh6GFNVoVh7rCbreVVe_7cCVtQd-pBMvpaU9GapLxAJgp4b8aTu0dMAKqEAA; HSID=AEG3XIlwu2RU2VoPD; APISID=PiTsyS3Gn_imQxeZ/AbvLU_xhZzXQv9BGQ",
    })
      .then(setYoutube)
      .catch(console.warn);
    LOGGER.debug("Created Innertube Object");
  }, [cookieSettings.settings]);

  // useEffect(() => {
  //   // TODO: Check if visitorData is wanted
  //   if (youtube && true) {
  //     youtube.actions
  //       .execute("/visitor_id?key=AIzaSyDCU8hByM-4DrUqRUYnGn-3llEO78bcxq8")
  //       .then(response => {
  //         console.log("VisitorData: ", JSON.stringify(response.data));
  //       });
  //   }
  // }, [youtube]);

  return youtube;
}

function makeid(length: number) {
  let result = "";
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  const charactersLength = characters.length;
  let counter = 0;
  while (counter < length) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
    counter += 1;
  }
  return result;
}
