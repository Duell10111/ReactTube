import React, {useState} from "react";
import {Pressable, type PressableProps, StyleSheet} from "react-native";

import {AppText} from "./AppText";

import {useAppTheme} from "@/ui/theme";

interface ChipProps extends Omit<PressableProps, "children" | "style"> {
  label: string;
  selected?: boolean;
}

export function Chip({
  label,
  selected = false,
  disabled = false,
  onFocus,
  onBlur,
  ...props
}: ChipProps) {
  const {theme} = useAppTheme();
  const [focused, setFocused] = useState(false);

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole={"button"}
      accessibilityState={{disabled: Boolean(disabled), selected}}
      disabled={disabled}
      onBlur={event => {
        setFocused(false);
        onBlur?.(event);
      }}
      onFocus={event => {
        setFocused(true);
        onFocus?.(event);
      }}
      style={({pressed}) => [
        styles.chip,
        {
          backgroundColor: selected
            ? theme.colors.textPrimary
            : pressed || focused
              ? theme.colors.surfacePressed
              : theme.colors.surfaceRaised,
          borderColor: focused ? theme.colors.focus : theme.colors.focusResting,
          borderRadius: theme.radii.control,
          paddingHorizontal: theme.spacing.lg,
        },
        disabled && styles.disabled,
      ]}
      {...props}>
      <AppText
        numberOfLines={1}
        style={{
          color: selected ? theme.colors.background : theme.colors.textPrimary,
        }}
        variant={"label"}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 48,
    justifyContent: "center",
    borderWidth: 3,
  },
  disabled: {
    opacity: 0.45,
  },
});
