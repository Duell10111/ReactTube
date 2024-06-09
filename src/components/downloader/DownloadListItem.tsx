import {useNavigation} from "@react-navigation/native";
import {ListItem} from "@rneui/base";
import {Text} from "react-native";

interface DownloadListItemProps {
  id: string;
  name?: string;
}

export function DownloadListItem({id, name}: DownloadListItemProps) {
  const navigation = useNavigation();
  return (
    <ListItem
      containerStyle={{backgroundColor: "grey"}}
      onPress={() => navigation.navigate("DownloadPlayer", {id})}>
      <ListItem.Title>{name ?? id}</ListItem.Title>
      <Text style={{color: "white"}}>{id}</Text>
    </ListItem>
  );
}
