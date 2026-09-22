import {Image, Pressable, StyleSheet, View} from "react-native";

import {MusicPlayerActionButton} from "@/components/music/player/MusicPlayerActionButton";
import {useMusikPlayerContext} from "@/context/MusicPlayerContext";
import {HorizontalData} from "@/extraction/ShelfExtraction";
import {AppText} from "@/ui/components";
import {useAppTheme} from "@/ui/theme";
import Logger from "@/utils/Logger";

const LOGGER = Logger.extend("SEARCH_SECTION_BUTTON");

interface MusicSearchSectionButtonItemProps {
  data: HorizontalData;
}

export default function MusicSearchSectionButtonItem({
  data,
}: MusicSearchSectionButtonItemProps) {
  const {setPlaylistViaEndpoint} = useMusikPlayerContext();
  const {theme} = useAppTheme();

  const onPress = () => {
    if (data.on_tab) {
      if (data.on_tab.command?.type === "WatchEndpoint") {
        setPlaylistViaEndpoint(data.on_tab);
      } else {
        LOGGER.warn(
          `Navigation Endpoint type not handled: ${data.on_tab.command?.type}`,
        );
      }
    }
  };

  return (
    <Pressable accessibilityRole={"button"} onPress={onPress}>
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.colors.surfaceRaised,
            borderRadius: theme.radii.panel,
            margin: theme.spacing.sm,
            padding: theme.spacing.md,
          },
        ]}>
        <View style={styles.headerContainer}>
          <Image
            style={styles.image}
            source={{uri: data.thumbnail!.url}}
            resizeMode={"contain"}
          />
          <View style={styles.titleContainer}>
            <AppText variant={"titleSmall"}>{data.title}</AppText>
            <AppText color={"textSecondary"} variant={"bodySmall"}>
              {data.subtitle}
            </AppText>
          </View>
        </View>
        <View style={styles.buttonContainer}>
          {data.buttons?.map(button => {
            const iconType = "entypo";
            const iconName = "controller-play";
            let onPressActionBtn: () => void = () => {};
            if (button.type === "PLAY") {
              onPressActionBtn = () => {
                button.endpoint && setPlaylistViaEndpoint(button.endpoint);
              };
            }

            return (
              <MusicPlayerActionButton
                key={button.type}
                title={button.title}
                onPress={onPressActionBtn}
                iconType={iconType}
                iconName={iconName}
              />
            );
          })}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {},
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 10,
  },
  image: {
    borderRadius: 5,
    width: 60,
    height: 60,
  },
  titleContainer: {
    flex: 1,
    marginStart: 10,
  },
  buttonContainer: {
    flexDirection: "row",
    marginBottom: 5,
  },
});
