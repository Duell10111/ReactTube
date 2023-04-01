import useYoutube from "./useYoutube";
import {useEffect, useState} from "react";
import {genericPage} from "youtube-extractor/dist/src/types";

export default function useHomeScreen() {
  const youtube = useYoutube();
  const [homePage, setHomePage] = useState<genericPage>();

  useEffect(() => {
    if (youtube) {
      youtube
        .getHomePage()
        .then(value => {
          console.log("Value: ", JSON.stringify(value, null, 2));
          setHomePage(value);
        })
        .catch(reason => {
          console.log(JSON.stringify(reason));
          console.warn(reason);
        });
    }
  }, [youtube]);

  return homePage;
}
