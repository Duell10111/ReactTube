import {ListItem} from "@rneui/base";
import {Text} from "react-native";

import {DownloadObject} from "../../hooks/downloader/useDownloadProcessor";

interface Props {
  download: DownloadObject;
}

export default function ActiveDownloadListItem({download}: Props) {
  return (
    <ListItem>
      <Text style={{color: "black"}}>{download.id ?? "Test"}</Text>
      <Text style={{color: "black"}}>{download.process}</Text>
    </ListItem>
  );
}
