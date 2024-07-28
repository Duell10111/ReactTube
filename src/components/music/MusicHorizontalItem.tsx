import {MusicClassicHorizontalList} from "./MusicClassicHorizontalList";
import {MusicHorizontalNRowShelf} from "./horizontal/MusicHorizontalNRowShelf";
import {HorizontalData} from "../../extraction/ShelfExtraction";

interface MusicHorizontalItemProps {
  data: HorizontalData;
}

export default function MusicHorizontalItem({data}: MusicHorizontalItemProps) {
  // console.log("Horizontal Item", data);

  // TODO: Add more types

  // TODO: Add Shelf for related etc.

  // TODO: Add text only list for description

  if (data.items_per_columns) {
    return (
      <MusicHorizontalNRowShelf
        data={data}
        itemRows={data.items_per_columns ?? 2}
      />
    );
  }

  return <MusicClassicHorizontalList data={data} />;
}
