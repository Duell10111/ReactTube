import {useCallback} from "react";
import {FlatList, ListRenderItem} from "react-native";

import {useMusikPlayerContext} from "../../../context/MusicPlayerContext";
import {HorizontalData} from "../../../extraction/ShelfExtraction";
import useMusicRelatedInfo from "../../../hooks/music/useMusicRelatedInfo";
import MusicHorizontalItem from "../MusicHorizontalItem";

export function MusicPlayerRelatedTab() {
  const {currentItem} = useMusikPlayerContext();
  const {relatedSections, message} = useMusicRelatedInfo(currentItem?.id ?? "");

  console.log("Related: ", relatedSections);

  const renderItem = useCallback<ListRenderItem<HorizontalData>>(({item}) => {
    return <MusicHorizontalItem data={item} />;
  }, []);

  return <FlatList data={relatedSections} renderItem={renderItem} />;
}
