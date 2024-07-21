import {MusicClassicHorizontalList} from "./MusicClassicHorizontalList";
import {HorizontalData} from "../../extraction/ShelfExtraction";
import HorizontalVideoList from "../HorizontalVideoList";
import PageSectionList from "../segments/PageSectionList";

interface MusicHorizontalItemProps {
  data: HorizontalData;
}

export default function MusicHorizontalItem({data}: MusicHorizontalItemProps) {
  // console.log("Horizontal Item", data);

  // TODO: Add more types

  return <MusicClassicHorizontalList data={data} />;
}
