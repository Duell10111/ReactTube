import {useEffect, useState} from "react";
import {Innertube} from "../utils/Youtube";
import {Settings} from "react-native";

const visitorDataKey = "visitorDataYT";

export default function useYoutube() {
  const [youtube, setYoutube] = useState<Innertube>();

  useEffect(() => {
    // let visitorData = Settings.get(visitorDataKey);
    // if (true) {
    //   visitorData = makeid(24);
    //   Settings.set({
    //     [visitorDataKey]: visitorData,
    //   });
    // }

    Innertube.create({}).then(setYoutube).catch(console.warn);
  }, []);

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
