import {Image, StyleSheet, Text, TouchableOpacity, View} from "react-native";

import {MusicPlayerActionButton} from "@/components/music/player/MusicPlayerActionButton";
import {useMusikPlayerContext} from "@/context/MusicPlayerContext";
import {HorizontalData} from "@/extraction/ShelfExtraction";
import Logger from "@/utils/Logger";

const LOGGER = Logger.extend("SEARCH_SECTION_BUTTON");

interface MusicSearchSectionButtonItemProps {
  data: HorizontalData;
}

export default function MusicSearchSectionButtonItem({
  data,
}: MusicSearchSectionButtonItemProps) {
  const {setPlaylistViaEndpoint} = useMusikPlayerContext();

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

  console.log(data.on_tab);
  console.log(data.on_tab?.command?.type);

  return (
    <TouchableOpacity onPress={onPress}>
      <View style={styles.container}>
        <View style={styles.headerContainer}>
          <Image
            style={styles.image}
            source={{uri: data.thumbnail!.url}}
            resizeMode={"contain"}
          />
          <View style={styles.titleContainer}>
            <Text style={styles.titleStyle}>{data.title}</Text>
            <Text style={styles.subtitleStyle}>{data.subtitle}</Text>
          </View>
        </View>
        <View style={styles.buttonContainer}>
          {data.buttons?.map(button => {
            const iconType = "entypo";
            const iconName = "controller-play";
            let onPress: () => void = () => {};
            if (button.type === "PLAY") {
              onPress = () => {
                console.log(button.endpoint);
                button.endpoint && setPlaylistViaEndpoint(button.endpoint);
              };
            }

            return (
              <MusicPlayerActionButton
                key={button.type}
                title={button.title}
                onPress={onPress}
                iconType={iconType}
                iconName={iconName}
              />
            );
          })}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 5,
    padding: 5,
    paddingHorizontal: 10,
    backgroundColor: "#222",
    borderRadius: 25,
  },
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
  titleStyle: {
    flex: 1,
    fontSize: 18,
    color: "white",
  },
  subtitleStyle: {
    color: "white",
  },
  buttonContainer: {
    flexDirection: "row",
    marginBottom: 5,
  },
});
