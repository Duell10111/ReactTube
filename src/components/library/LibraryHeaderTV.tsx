// Header to contain Top Button to navigate to a specific section?
import {useNavigation} from "@react-navigation/native";
import {NativeStackNavigationProp} from "@react-navigation/native-stack";
import {ScrollView} from "react-native";

import {LibraryHeaderTVItem} from "@/components/library/LibraryHeaderTVItem";
import {useTranslation} from "@/localization";
import {RootDrawerParamList} from "@/navigation/DrawerStackNavigator";

export function LibraryHeaderTV() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootDrawerParamList>>();
  const {t} = useTranslation();

  return (
    <ScrollView horizontal>
      <LibraryHeaderTVItem
        title={t("navigation.playlists")}
        onPress={() => navigation.navigate("PlaylistsScreen")}
      />
      <LibraryHeaderTVItem
        title={t("navigation.history")}
        onPress={() => navigation.navigate("HistoryScreen")}
      />
    </ScrollView>
  );
}
