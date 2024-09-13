import {useNavigation} from "@react-navigation/native";
import {NativeStackNavigationProp} from "@react-navigation/native-stack";
import {Icon} from "@rneui/base";
import React, {useCallback, useEffect} from "react";
import {FlatList, ListRenderItem} from "react-native";

import MusicHorizontalItem from "../../components/music/MusicHorizontalItem";
import useMusicHome from "../../hooks/music/useMusicHome";

import {HorizontalData} from "@/extraction/ShelfExtraction";
import {RootStackParamList} from "@/navigation/RootStackNavigator";

export function MusicHomeScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {data, fetchContinuation} = useMusicHome();

  useEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <Icon
          name={"library-music"}
          type={"material"}
          onPress={() => navigation.navigate("MusicLibraryScreen")}
          color={"white"}
          style={{marginStart: 10}}
        />
      ),
      headerRight: () => (
        <Icon
          name={"search"}
          onPress={() => navigation.navigate("MusicSearchScreen")}
          color={"white"}
          style={{marginEnd: 10}}
        />
      ),
    });
  }, [navigation]);

  const renderItem = useCallback<ListRenderItem<HorizontalData>>(({item}) => {
    return <MusicHorizontalItem data={item} />;
  }, []);

  return (
    <FlatList
      data={data}
      renderItem={renderItem}
      onEndReached={fetchContinuation}
    />
  );
}
