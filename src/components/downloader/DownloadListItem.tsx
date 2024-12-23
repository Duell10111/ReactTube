import {useNavigation} from "@react-navigation/native";
import {Button, ListItem} from "@rneui/base";
import {Text} from "react-native";

import {useDownloaderContext} from "@/context/DownloaderContext";
import {useMusikPlayerContext} from "@/context/MusicPlayerContext";
import {NativeStackProp} from "@/navigation/types";

interface DownloadListItemProps {
  id: string;
  name?: string;
}

export function DownloadListItem({id, name}: DownloadListItemProps) {
  const navigation = useNavigation<NativeStackProp>();
  const {uploadToWatch} = useDownloaderContext();
  const {setPlaylistViaLocalDownload} = useMusikPlayerContext();

  return (
    <ListItem.Swipeable
      rightContent={reset => (
        <Button
          title={"Upload"}
          onPress={() => {
            reset();
            uploadToWatch(id);
          }}
          icon={{name: "delete", color: "white"}}
          buttonStyle={{minHeight: "100%", backgroundColor: "red"}}
        />
      )}
      containerStyle={{backgroundColor: "grey"}}
      onPress={() => setPlaylistViaLocalDownload(id)}>
      <ListItem.Title>{name ?? id}</ListItem.Title>
      <Text style={{color: "white"}}>{id}</Text>
    </ListItem.Swipeable>
  );
}
