import {useState} from "react";
import {StyleSheet, View} from "react-native";
import {Button, TextInput} from "react-native-paper";

interface PlaylistManagerCreatePanelProps {
  onPlaylistCreate: (name: string) => void;
}

export function PlaylistManagerCreatePanel({
  onPlaylistCreate,
}: PlaylistManagerCreatePanelProps) {
  const [name, setName] = useState<string>();

  return (
    <View style={styles.container}>
      <TextInput
        label={"Playlist Name"}
        mode={"flat"}
        onChangeText={setName}
        value={name}
      />
      <Button
        style={styles.createButton}
        mode={"contained"}
        dark
        onPress={() => onPlaylistCreate(name)}>
        {"Create Playlist"}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "80%",
  },
  createButton: {
    marginTop: 20,
  },
});
