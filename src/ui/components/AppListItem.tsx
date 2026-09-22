import {MaterialIcons} from "@expo/vector-icons";
import React, {useState} from "react";
import {Pressable, StyleSheet, View, type ViewStyle} from "react-native";

import {AppText} from "./AppText";

import {useAppTheme} from "@/ui/theme";

interface AppListItemProps {
  title: string;
  subtitle?: string;
  icon?: React.ComponentProps<typeof MaterialIcons>["name"];
  trailingText?: string;
  selected?: boolean;
  destructive?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  style?: ViewStyle;
}

/** Shared row for settings, libraries, transfers, and modal action lists. */
export function AppListItem({
  title,
  subtitle,
  icon,
  trailingText,
  selected = false,
  destructive = false,
  disabled = false,
  onPress,
  leading,
  trailing,
  style,
}: AppListItemProps) {
  const {theme} = useAppTheme();
  const [focused, setFocused] = useState(false);
  const foreground = destructive
    ? theme.colors.error
    : theme.colors.textPrimary;

  return (
    <Pressable
      accessibilityLabel={[title, subtitle, trailingText]
        .filter(Boolean)
        .join(", ")}
      accessibilityRole={onPress ? "button" : "text"}
      accessibilityState={{disabled, selected}}
      disabled={disabled || !onPress}
      onBlur={() => setFocused(false)}
      onFocus={() => setFocused(true)}
      onPress={onPress}
      style={({pressed}) => [
        styles.row,
        style,
        {
          backgroundColor:
            pressed || focused || selected
              ? theme.colors.surfacePressed
              : theme.colors.surface,
          borderColor: focused ? theme.colors.focus : theme.colors.divider,
          borderRadius: theme.radii.control,
          gap: theme.spacing.md,
          minHeight: 56,
          paddingHorizontal: theme.spacing.lg,
          paddingVertical: theme.spacing.sm,
          opacity: disabled ? 0.45 : 1,
        },
      ]}>
      {leading}
      {icon ? <MaterialIcons color={foreground} name={icon} size={24} /> : null}
      <View style={styles.copy}>
        <AppText numberOfLines={2} style={{color: foreground}} variant={"body"}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText
            color={"textSecondary"}
            numberOfLines={2}
            variant={"bodySmall"}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {trailingText ? (
        <AppText
          color={"textSecondary"}
          numberOfLines={1}
          variant={"bodySmall"}>
          {trailingText}
        </AppText>
      ) : null}
      {trailing}
      {onPress && !trailing ? (
        <MaterialIcons
          color={theme.colors.textSecondary}
          name={selected ? "check" : "chevron-right"}
          size={24}
        />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    width: "100%",
  },
  copy: {
    flex: 1,
  },
});
