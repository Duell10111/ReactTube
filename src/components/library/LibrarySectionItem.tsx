import {useNavigation} from "@react-navigation/native";
import _ from "lodash";
import {useMemo} from "react";
import {FlatList, Platform, Pressable, StyleSheet, View} from "react-native";

import {YTLibrarySection} from "@/extraction/Types";
import useLibrarySection from "@/hooks/useLibrarySection";
import {useTranslation} from "@/localization";
import {NativeStackProp} from "@/navigation/types";
import {AppText} from "@/ui/components";
import {MediaCard} from "@/ui/patterns";
import {useAppTheme} from "@/ui/theme";

interface LibrarySectionItemProps {
  section: YTLibrarySection;
  elementWidth?: number;
}

export function LibrarySectionItem({
  section,
  elementWidth,
}: LibrarySectionItemProps) {
  const {data, fetchMore} = useLibrarySection(section);
  const navigation = useNavigation<NativeStackProp>();
  const {t} = useTranslation();
  const {theme} = useAppTheme();

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

  const onPress = useMemo(() => {
    if (section.playlistId) {
      return () => {
        section.playlistId &&
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

  return (
    <View style={{gap: theme.spacing.md, paddingVertical: theme.spacing.md}}>
      <Pressable
        accessibilityRole={onPress ? "button" : "header"}
        disabled={!onPress}
        onPress={onPress}
        style={[styles.header, {paddingHorizontal: theme.spacing.lg}]}>
        <AppText style={styles.title} variant={"titleMedium"}>
          {section.title}
        </AppText>
        {onPress ? (
          <AppText color={"textSecondary"} variant={"label"}>
            {t("feed.seeAll")}
          </AppText>
        ) : null}
      </Pressable>
      <FlatList
        contentContainerStyle={{
          gap: theme.spacing.md,
          paddingHorizontal: theme.spacing.lg,
        }}
        data={filteredData}
        horizontal
        keyExtractor={item => item.id}
        onEndReached={fetchMore}
        onEndReachedThreshold={0.7}
        renderItem={({item}) => (
          <MediaCard
            element={item}
            width={elementWidth ?? (Platform.isTV ? 360 : 220)}
          />
        )}
        showsHorizontalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    flexDirection: "row",
  },
  title: {
    flex: 1,
  },
});
