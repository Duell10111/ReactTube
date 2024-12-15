import {Input} from "@rneui/base";
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
      <Input label={"Playlist Name"} onChangeText={setName} value={name} />
      <TextInput
        label={"Playlist Name"}
        mode={"flat"}
        onChangeText={setName}
        value={name}
      />
      <Button mode={"contained"} dark onPress={() => onPlaylistCreate(name)}>
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
});
