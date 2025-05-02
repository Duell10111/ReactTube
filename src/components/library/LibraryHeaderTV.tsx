// Header to contain Top Button to navigate to a specific section?
import {useNavigation} from "@react-navigation/native";
import {NativeStackNavigationProp} from "@react-navigation/native-stack";
import {ScrollView} from "react-native";

import {LibraryHeaderTVItem} from "@/components/library/LibraryHeaderTVItem";
import {RootDrawerParamList} from "@/navigation/DrawerStackNavigator";

export function LibraryHeaderTV() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootDrawerParamList>>();

  return (
    <ScrollView horizontal>
      <LibraryHeaderTVItem
        title={"Playlists"}
        color={"red"}
        onPress={() => navigation.navigate("PlaylistsScreen")}
      />
      <LibraryHeaderTVItem
        title={"History"}
        color={"blue"}
        onPress={() => navigation.navigate("HistoryScreen")}
      />
    </ScrollView>
  );
}
