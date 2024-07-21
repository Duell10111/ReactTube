import {useCallback} from "react";
import {FlatList, ListRenderItem} from "react-native";

import MusicHorizontalItem from "../../components/music/MusicHorizontalItem";
import {HorizontalData} from "../../extraction/ShelfExtraction";
import useMusicHome from "../../hooks/music/useMusicHome";

export function MusicHomeScreen() {
  const {data, fetchContinuation} = useMusicHome();

  const renderItem = useCallback<ListRenderItem<HorizontalData>>(({item}) => {
    return <MusicHorizontalItem data={item} />;
  }, []);

  return <FlatList data={data} renderItem={renderItem} />;
}
