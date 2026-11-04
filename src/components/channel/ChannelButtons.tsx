import {useState} from "react";
import {Pressable, StyleSheet, View} from "react-native";

import type {TVChannelTab} from "./tv/channelModel";

import {AppText} from "@/ui/components";
import {useAppTheme} from "@/ui/theme";
import {TVFocusRegion, useTVOverscanInsets} from "@/ui/tv";

interface ButtonValue {
  value: TVChannelTab;
  label: string;
}

interface ChannelButtonsProps {
  value: TVChannelTab;
  onValueChange: (value: TVChannelTab) => void;
  buttons: ButtonValue[];
  onFocus: () => void;
}

export default function ChannelButtons({
  buttons,
  onValueChange,
  value,
  onFocus,
}: ChannelButtonsProps) {
  const {theme} = useAppTheme();
  const contentInsets = useTVOverscanInsets();
  return (
    <TVFocusRegion
      style={[
        styles.row,
        {
          marginStart: contentInsets.left,
          marginEnd: contentInsets.right,
          gap: theme.spacing.sm,
          paddingVertical: theme.spacing.sm,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.divider,
        },
      ]}
      testID={"tv-channel-tabs"}>
      {buttons.map(button => (
        <ChannelTabButton
          key={button.value}
          button={button}
          selected={value === button.value}
          onFocus={onFocus}
          onPress={() => onValueChange(button.value)}
        />
      ))}
    </TVFocusRegion>
  );
}

function ChannelTabButton({
  button,
  selected,
  onPress,
  onFocus,
}: {
  button: ButtonValue;
  selected: boolean;
  onPress: () => void;
  onFocus: () => void;
}) {
  const {theme} = useAppTheme();
  const [focused, setFocused] = useState(false);
  return (
    <Pressable
      accessibilityLabel={button.label}
      accessibilityRole={"tab"}
      accessibilityState={{selected}}
      onPress={onPress}
      onBlur={() => setFocused(false)}
      onFocus={() => {
        setFocused(true);
        onFocus();
      }}
      style={({pressed}) => [
        styles.tab,
        {
          minHeight: theme.controls.minTarget,
          paddingHorizontal: theme.spacing.lg,
          borderRadius: theme.radii.round,
          backgroundColor: focused
            ? theme.colors.textPrimary
            : pressed || selected
              ? theme.colors.surfacePressed
              : "transparent",
        },
      ]}
      testID={`tv-channel-tab-${button.value.toLowerCase()}`}>
      <AppText
        variant={"label"}
        numberOfLines={1}
        style={{
          color: focused
            ? theme.colors.background
            : selected
              ? theme.colors.textPrimary
              : theme.colors.textSecondary,
        }}>
        {button.label}
      </AppText>
      <View
        style={[
          styles.indicator,
          {
            backgroundColor: selected
              ? focused
                ? theme.colors.background
                : theme.colors.textPrimary
              : "transparent",
          },
        ]}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {flexDirection: "row", alignItems: "center"},
  tab: {alignItems: "center", justifyContent: "center"},
  indicator: {
    position: "absolute",
    bottom: 6,
    width: 20,
    height: 3,
    borderRadius: 2,
  },
});
