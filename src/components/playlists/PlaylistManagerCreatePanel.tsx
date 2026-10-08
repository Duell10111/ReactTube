import {BottomSheetTextInput} from "@gorhom/bottom-sheet";
import {useState} from "react";
import {StyleSheet, View} from "react-native";
import {Button, TextInput} from "react-native-paper";

import {footerClearance} from "@/components/playlists/PlaylistManagerList";
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
        // Lets the sheet move above the keyboard while the name is typed.
        render={props => <BottomSheetTextInput {...props} />}
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
    width: "100%",
    // The sheet sizes itself to this content, so it has to leave room for the
    // floating back button in the sheet footer.
    paddingBottom: footerClearance,
  },
  createButton: {
    marginTop: 20,
  },
});
