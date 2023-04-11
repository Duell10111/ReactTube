import {useWindowDimensions} from "react-native";
import {Helpers} from "../../utils/Youtube";
import {useMemo} from "react";
import _ from "lodash";

const firstRows = 2;

export default function useHomeShelf(content: Helpers.YTNode[]) {
  const {width} = useWindowDimensions();

  const list = useMemo(() => {
    const column = Math.floor(width / 500);
    const groups = _.groupBy(content, node => node.type);

    console.log(column);
    console.log(JSON.stringify(Object.keys(groups), null, 4));

    const types = Object.keys(groups);

    if (types.indexOf("RichSection") >= 0) {
      const items = groups.RichItem;

      const newArray = [];

      for (const sections of groups.RichSection) {
        for (let i = 0; i < firstRows; i++) {
          newArray.push(items.splice(0, 3));
        }
        newArray.push(sections);
      }
      newArray.push(..._.chunk(items, 3));

      return newArray;
    } else {
      return content;
    }
  }, [content, width]);

  console.log(list.map(v => listPrint(v)));

  return list;
}

function listPrint(v) {
  if (Array.isArray(v)) {
    return v.map(v => listPrint(v));
  }
  return v.type;
}
