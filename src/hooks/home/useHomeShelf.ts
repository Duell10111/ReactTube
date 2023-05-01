import {useWindowDimensions} from "react-native";
import {Helpers} from "../../utils/Youtube";
import {useMemo} from "react";
import _ from "lodash";

const firstRows = 2;

const videoItems = ["RichItem", "Video"];
const sectionItems = ["RichSection", "Shelf", "ReelShelf", "ItemSection"];

function gridCalculator(content: Helpers.YTNode[], columns: number) {
  const groups = _.groupBy(content, node => node.type);

  const types = Object.keys(groups);
  console.log("Types: ", types);

  const sectionsAvailable = _.intersection(types, sectionItems);

  if (sectionsAvailable.length > 0) {
    console.log("Sections Found");
    const items = _.chain(videoItems)
      .intersection(types)
      .map(type => groups[type])
      .flatten()
      .value();
    const sectionsItems = _.chain(sectionItems)
      .intersection(types)
      .map(type => groups[type])
      .flatten()
      .value();

    const newArray = [];

    for (const sections of sectionsItems) {
      for (let i = 0; i < firstRows; i++) {
        newArray.push(items.splice(0, columns));
      }
      newArray.push(sections);
    }
    newArray.push(..._.chunk(items, columns));

    return newArray;
  } else {
    //TODO: Currently still does not work properly
    console.log(
      "Alternative: ",
      content.map(v => listPrint(v)),
    );
    console.log(content.length);
    const alContent = _.chunk(_.clone(content), columns);
    console.log(
      "Alternative Content: ",
      alContent.map(v => listPrint(v)),
    );
    return alContent;
  }
}

export default function useHomeShelf(content: Helpers.YTNode[]) {
  const {width} = useWindowDimensions();

  const list = useMemo(() => {
    const column = Math.floor(width / 500);

    return gridCalculator(content, column);
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
