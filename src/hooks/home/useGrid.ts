import {useWindowDimensions} from "react-native";
import {useMemo} from "react";
import {gridCalculator} from "../../extraction/ShelfExtraction";
import {Helpers} from "../../utils/Youtube";

export default function useGrid(content: Helpers.YTNode[]) {
  const {width} = useWindowDimensions();

  const list = useMemo(() => {
    const column = Math.floor(width / 500);

    return gridCalculator(content, column);
  }, [content, width]);

  console.log(list.map(v => listPrint(v)));

  return list;
}

function listPrint(v: any): any {
  if (Array.isArray(v)) {
    return v.map((v2: any) => listPrint(v2));
  }
  return v?.originalNode?.type;
}
