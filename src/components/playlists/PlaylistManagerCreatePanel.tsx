import {useState} from "react";
import {StyleSheet, View} from "react-native";
import {Button, TextInput} from "react-native-paper";

import {useTranslation} from "@/localization";

interface PlaylistManagerCreatePanelProps {
  onPlaylistCreate: (name: string) => void;
}

export function PlaylistManagerCreatePanel({
  onPlaylistCreate,
}: PlaylistManagerCreatePanelProps) {
  const [name, setName] = useState<string>();
  const {t} = useTranslation();

  return (
    <View style={styles.container}>
      <TextInput
        label={t("playlist.manager.name")}
        mode={"flat"}
        onChangeText={setName}
        value={name}
      />
      <Button
        style={styles.createButton}
        mode={"contained"}
        dark
        onPress={() => name && name.length > 0 && onPlaylistCreate(name)}>
        {t("playlist.manager.create")}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
  },
  createButton: {
    marginTop: 20,
  },
});
