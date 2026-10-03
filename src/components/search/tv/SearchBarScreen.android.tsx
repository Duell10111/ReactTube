import React, {useCallback, useState} from "react";
import {ScrollView, StyleSheet, TextInput, View} from "react-native";

import {SearchResultFeed} from "@/components/search/SearchResultFeed";
import {useTranslation} from "@/localization";
import {Chip} from "@/ui/components";
import type {FeedItem} from "@/ui/patterns";
import {useAppTheme} from "@/ui/theme";
import {useTVOverscanInsets} from "@/ui/tv/useTVOverscanInsets";

interface SearchBarScreenProps {
  items: FeedItem[];
  hints: string[];
  query: string;
  loading: boolean;
  error: unknown;
  performSearch(text: string): void;
  fetchMore(): Promise<unknown>;
}

/**
 * Android TV variant of the TV search screen. The native search bar used on
 * tvOS has no Android implementation, so this one builds the same flow from a
 * plain text field, a row of suggestions, and the shared result feed.
 */
export function SearchBarScreen({
  hints,
  items,
  query,
  loading,
  error,
  performSearch,
  fetchMore,
}: SearchBarScreenProps) {
  const {t} = useTranslation();
  const {theme} = useAppTheme();
  const insets = useTVOverscanInsets();
  const [text, setText] = useState("");
  const [inputFocused, setInputFocused] = useState(false);

  const search = useCallback(
    (nextText: string) => {
      setText(nextText);
      performSearch(nextText);
    },
    [performSearch],
  );

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        },
      ]}>
      <TextInput
        accessibilityLabel={t("search.placeholder")}
        autoFocus
        onBlur={() => setInputFocused(false)}
        onChangeText={search}
        onFocus={() => setInputFocused(true)}
        onSubmitEditing={event => search(event.nativeEvent.text)}
        placeholder={t("search.placeholder")}
        placeholderTextColor={theme.colors.textSecondary}
        returnKeyType={"search"}
        selectionColor={theme.colors.textPrimary}
        style={[
          styles.input,
          {
            backgroundColor: inputFocused
              ? theme.colors.surfacePressed
              : theme.colors.surfaceRaised,
            borderColor: inputFocused
              ? theme.colors.focus
              : theme.colors.focusResting,
            borderRadius: theme.radii.control,
            borderWidth: theme.controls.focusBorderWidth,
            color: theme.colors.textPrimary,
            fontSize: theme.typography.titleSmall.fontSize,
            minHeight: theme.controls.minTarget,
            paddingHorizontal: theme.spacing.xl,
          },
        ]}
        value={text}
      />
      {hints.length > 0 ? (
        <ScrollView
          contentContainerStyle={{
            gap: theme.spacing.md,
            paddingVertical: theme.spacing.lg,
          }}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.hints}>
          {hints.map(hint => (
            <Chip key={hint} label={hint} onPress={() => search(hint)} />
          ))}
        </ScrollView>
      ) : null}
      <View style={styles.container}>
        <SearchResultFeed
          error={error}
          fetchMore={fetchMore}
          items={items}
          loading={loading}
          query={query}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  input: {
    width: "100%",
  },
  hints: {
    flexGrow: 0,
  },
});
