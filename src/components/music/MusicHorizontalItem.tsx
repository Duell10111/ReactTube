import {MusicClassicHorizontalList} from "./MusicClassicHorizontalList";
import {MusicHorizontalNRowShelf} from "./horizontal/MusicHorizontalNRowShelf";

import {MusicDescriptionHorizontalItem} from "@/components/music/MusicDescriptionHorizontalItem";
import {HorizontalData} from "@/extraction/ShelfExtraction";

interface MusicHorizontalItemProps {
  data: HorizontalData;
}

export default function MusicHorizontalItem({data}: MusicHorizontalItemProps) {
  // console.log("Horizontal Item", data);

  // TODO: Add more types

  // TODO: Add Shelf for related etc.

  if (data.parsedData.length === 0 && data.title.length > 0) {
    return <MusicDescriptionHorizontalItem data={data} />;
  }

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
