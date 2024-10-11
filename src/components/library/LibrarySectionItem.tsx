import {useNavigation} from "@react-navigation/native";
import _ from "lodash";
import {useMemo} from "react";
import {StyleSheet, Text, TouchableOpacity, View} from "react-native";

import {HorizontalElementsList} from "@/components/library/HorizontalElementsList";
import {useAppStyle} from "@/context/AppStyleContext";
import {YTLibrarySection} from "@/extraction/Types";
import useLibrarySection from "@/hooks/useLibrarySection";
import {NativeStackProp} from "@/navigation/types";

interface LibrarySectionItemProps {
  section: YTLibrarySection;
}

export function LibrarySectionItem({section}: LibrarySectionItemProps) {
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

  if (section.content.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        disabled={!section.playlistId}
        onPress={() => {
          navigation.navigate("PlaylistScreen", {
            playlistId: section.playlistId,
          });
        }}>
        <Text style={[styles.textStyle, {color: style.textColor}]}>
          {section.title}
        </Text>
      </TouchableOpacity>
      <HorizontalElementsList
        elements={filteredData}
        onEndReached={fetchMore}
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
