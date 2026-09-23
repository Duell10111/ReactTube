import {useNavigation} from "@react-navigation/native";
import React, {useMemo} from "react";
import {View} from "react-native";

import {MusicCardShelf} from "./MusicCardShelf";
import {MusicSectionHeader} from "./MusicSectionHeader";
import {MusicTrackShelf} from "./MusicTrackShelf";
import {createMusicSectionModel} from "./musicSectionModel";

import {useMusikPlayerContext} from "@/context/MusicPlayerContext";
import type {HorizontalData} from "@/extraction/ShelfExtraction";
import type {RootNavProp} from "@/navigation/RootStackNavigator";
import {AppText} from "@/ui/components";
import {useAppTheme} from "@/ui/theme";

interface MusicSectionProps {
  data: HorizontalData;
  /** Width available to the section, padding included. */
  containerWidth: number;
  padding: number;
}

/** One shelf of a music surface, in the form the shelf asked to be shown in. */
export function MusicSection({
  data,
  containerWidth,
  padding,
}: MusicSectionProps) {
  const {theme} = useAppTheme();
  const navigation = useNavigation<RootNavProp>();
  const {setPlaylistViaEndpoint} = useMusikPlayerContext();
  const model = useMemo(() => createMusicSectionModel(data), [data]);

  if (model.kind === "description") {
    // A shelf without entries is Music's prose block — an album description or
    // a note under a shelf. Anything else with no items has nothing to show.
    return model.title ? (
      <View style={{paddingHorizontal: padding}}>
        <AppText color={"textSecondary"} numberOfLines={6} variant={"body"}>
          {model.title}
        </AppText>
      </View>
    ) : null;
  }

  const playAllEndpoint = model.playAll?.endpoint;

  return (
    <View style={{gap: theme.spacing.md}}>
      <View style={{paddingHorizontal: padding}}>
        <MusicSectionHeader
          onPlayAll={
            playAllEndpoint
              ? () => {
                  setPlaylistViaEndpoint(playAllEndpoint);
                  navigation.navigate("MusicPlayerScreen");
                }
              : undefined
          }
          strapline={model.strapline}
          title={model.title}
        />
      </View>
      {model.kind === "tracks" ? (
        <MusicTrackShelf
          containerWidth={containerWidth}
          items={model.items}
          padding={padding}
          rows={model.rows}
        />
      ) : (
        <MusicCardShelf
          containerWidth={containerWidth}
          items={model.items}
          padding={padding}
        />
      )}
    </View>
  );
}
