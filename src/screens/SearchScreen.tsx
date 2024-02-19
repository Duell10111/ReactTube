import React, {useLayoutEffect, useState} from "react";
import useSearchScreen from "../hooks/useSearchScreen";
import {View} from "react-native";
import GridView from "../components/GridView";
import useGridColumnsPreferred from "../hooks/home/useGridColumnsPreferred";
import {useNavigation} from "@react-navigation/native";
import {NativeStackNavigationProp} from "@react-navigation/native-stack";
import {RootStackParamList} from "../navigation/RootStackNavigator";

export default function SearchScreen() {
  const {search, searchResult, fetchMore} = useSearchScreen();
  const [searchText, setSearchText] = useState("");

  const columns = useGridColumnsPreferred();

  // console.log(JSON.stringify(searchResult));

  console.log(searchResult.length);

  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const performSearch = (text?: string) => {
    console.log("Search: ", searchText);
    search(text ?? searchText).catch(console.warn);
    if (text) {
      setSearchText(text);
    }
  };

  console.log("Searchtext: ", searchText);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerSearchBarOptions: {
        placeholder: "Search",
        onChangeText: event => setSearchText(event.nativeEvent.text),
        onBlur: () => performSearch(),
        onSearchButtonPress: event => performSearch(event.nativeEvent.text),
        onClose: () => performSearch(),
        hideWhenScrolling: false,
      },
    });
  }, [navigation]);

  return (
    <>
      <View style={{flex: 1}}>
        <GridView
          columns={columns}
          shelfItem={searchResult}
          onEndReached={() => fetchMore().catch(console.warn)}
        />
      </View>
    </>
  );
}
