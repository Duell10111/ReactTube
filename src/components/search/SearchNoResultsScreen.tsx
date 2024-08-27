import Entypo from "@expo/vector-icons/Entypo";
import {Text, View} from "react-native";

export function SearchNoResultsScreen() {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}>
      <Entypo name={"warning"} size={50} color={"white"} />
      <Text style={{color: "white", fontSize: 20, paddingTop: 5}}>
        {"No results available"}
      </Text>
    </View>
  );
}
