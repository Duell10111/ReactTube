import _ from "lodash";
import {useMemo} from "react";
import {StyleSheet, Text, View} from "react-native";

import {HorizontalElementsList} from "@/components/library/HorizontalElementsList";
import {useAppStyle} from "@/context/AppStyleContext";
import {YTLibrarySection} from "@/extraction/Types";
import useLibrarySection from "@/hooks/useLibrarySection";

interface LibrarySectionItemProps {
  section: YTLibrarySection;
}

export function LibrarySectionItem({section}: LibrarySectionItemProps) {
  const {style} = useAppStyle();
  const {data, fetchMore} = useLibrarySection(section);

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

  if (section.content.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={[styles.textStyle, {color: style.textColor}]}>
        {section.title}
      </Text>
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
