import {MaterialIcons} from "@expo/vector-icons";
import React, {useState} from "react";
import {Pressable, type PressableProps, StyleSheet} from "react-native";

import {useAppTheme} from "@/ui/theme";

/**
 * `surface` is the quiet circle used in a header or a toolbar. `filled` is the
 * one action a surface is built around — the play button of a music hero — and
 * inverts the circle so it reads before the title does.
 */
type IconButtonVariant = "surface" | "filled";

interface AppIconButtonProps
  extends Omit<PressableProps, "accessibilityLabel" | "children" | "style"> {
  icon: React.ComponentProps<typeof MaterialIcons>["name"];
  accessibilityLabel: string;
  selected?: boolean;
  variant?: IconButtonVariant;
  /** `large` is reserved for a surface's primary action. */
  size?: "regular" | "large";
}

/** How much larger the primary action of a surface is than a plain control. */
const largeScale = 1.35;

export function AppIconButton({
  icon,
  accessibilityLabel,
  selected = false,
  disabled = false,
  variant = "surface",
  size = "regular",
  onFocus,
  onBlur,
  ...props
}: AppIconButtonProps) {
  const {theme} = useAppTheme();
  const [focused, setFocused] = useState(false);
  const filled = variant === "filled";
  const diameter = Math.round(
    theme.controls.minTarget * (size === "large" ? largeScale : 1),
  );
  const iconSize = Math.round(
    theme.controls.iconSize * (size === "large" ? largeScale : 1),
  );

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
          backgroundColor: filled
            ? theme.colors.textPrimary
            : pressed || focused || selected
              ? theme.colors.surfacePressed
              : theme.colors.surface,
          borderColor: focused ? theme.colors.focus : theme.colors.focusResting,
          borderRadius: theme.radii.round,
          borderWidth: theme.controls.focusBorderWidth,
          width: diameter,
          height: diameter,
        },
        filled && pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
      {...props}>
      <MaterialIcons
        color={
          disabled
            ? theme.colors.textDisabled
            : filled
              ? theme.colors.background
              : theme.colors.textPrimary
        }
        name={icon}
        size={iconSize}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    justifyContent: "center",
  },
  disabled: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.8,
  },
});
