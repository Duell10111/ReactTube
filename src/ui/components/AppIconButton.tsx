import {MaterialIcons} from "@expo/vector-icons";
import React, {useState} from "react";
import {Pressable, type PressableProps, StyleSheet} from "react-native";

import {useAppTheme} from "@/ui/theme";

interface AppIconButtonProps
  extends Omit<PressableProps, "accessibilityLabel" | "children" | "style"> {
  icon: React.ComponentProps<typeof MaterialIcons>["name"];
  accessibilityLabel: string;
  selected?: boolean;
}

export function AppIconButton({
  icon,
  accessibilityLabel,
  selected = false,
  disabled = false,
  onFocus,
  onBlur,
  ...props
}: AppIconButtonProps) {
  const {theme} = useAppTheme();
  const [focused, setFocused] = useState(false);

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
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
        styles.button,
        {
          backgroundColor:
            pressed || focused || selected
              ? theme.colors.surfacePressed
              : theme.colors.surface,
          borderColor: focused ? theme.colors.focus : theme.colors.focusResting,
          borderRadius: theme.radii.round,
        },
        disabled && styles.disabled,
      ]}
      {...props}>
      <MaterialIcons
        color={disabled ? theme.colors.textDisabled : theme.colors.textPrimary}
        name={icon}
        size={24}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 48,
    height: 48,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  disabled: {
    opacity: 0.45,
  },
});
