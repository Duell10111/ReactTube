import {useNavigation} from "@react-navigation/native";
import _ from "lodash";
import {useMemo} from "react";
import {Platform, StyleSheet, Text, TouchableOpacity, View} from "react-native";

import {HorizontalElementsList} from "@/components/library/HorizontalElementsList";
import {LibrarySectionMoreButtonTV} from "@/components/library/LibrarySectionMoreButtonTV";
import {useAppStyle} from "@/context/AppStyleContext";
import {YTLibrarySection} from "@/extraction/Types";
import useLibrarySection from "@/hooks/useLibrarySection";
import {NativeStackProp} from "@/navigation/types";

interface LibrarySectionItemProps {
  section: YTLibrarySection;
  elementWidth?: number;
}

export function LibrarySectionItem({
  section,
  elementWidth,
}: LibrarySectionItemProps) {
  const {style} = useAppStyle();
  const {data, fetchMore} = useLibrarySection(section);
  const navigation = useNavigation<NativeStackProp>();

  const filteredData = useMemo(() => {
    return _.chain(data)
      .flatMap(v => {
        if ("parsedData" in v) {
          return v.parsedData;
        }
        return v;
      })
      .value();
  }, [data]);

  console.log(section.title + " " + data);
  console.log("PlaylistID: ", section.playlistId);

  const onPress = useMemo(() => {
    if (section.playlistId) {
      return () => {
        navigation.navigate("PlaylistScreen", {
          playlistId: section.playlistId,
        });
      };
    } else if (section.type === "history") {
      return () => {
        navigation.navigate(Platform.isTV ? "HistoryScreen" : "History");
      };
    }
  }, [section]);

  if (section.content.length === 0) {
    return null;
  }

  // Mock Touchable for TV as it does not support disabled atm
  const Touchable = Platform.isTV && !onPress ? View : TouchableOpacity;

  return (
    <View style={styles.container}>
      <Touchable disabled={!onPress} onPress={onPress}>
        <Text style={[styles.textStyle, {color: style.textColor}]}>
          {section.title}
        </Text>
      </Touchable>
      <HorizontalElementsList
        elements={filteredData}
        onEndReached={fetchMore}
        width={elementWidth}
        endElement={
          onPress ? <LibrarySectionMoreButtonTV onPress={onPress} /> : undefined
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  textStyle: {
    fontSize: 25,
    paddingBottom: 10,
  },
});
