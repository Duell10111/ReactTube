import React, {useState} from "react";
import {
  ActivityIndicator,
  Pressable,
  type PressableProps,
  StyleSheet,
  View,
} from "react-native";

import {AppText} from "./AppText";

import {useAppTheme} from "@/ui/theme";

type ButtonVariant = "primary" | "secondary" | "danger";

interface AppButtonProps extends Omit<PressableProps, "children" | "style"> {
  label: string;
  variant?: ButtonVariant;
  loading?: boolean;
  fullWidth?: boolean;
}

export function AppButton({
  label,
  variant = "primary",
  loading = false,
  fullWidth = false,
  disabled = false,
  accessibilityLabel = label,
  onFocus,
  onBlur,
  ...props
}: AppButtonProps) {
  const {theme} = useAppTheme();
  const [focused, setFocused] = useState(false);
  const inactive = disabled || loading;
  const backgroundColor =
    variant === "primary"
      ? theme.colors.brand
      : variant === "danger"
        ? theme.colors.error
        : theme.colors.surfaceRaised;
  const foregroundColor =
    variant === "secondary" ? theme.colors.textPrimary : theme.colors.onBrand;

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={"button"}
      accessibilityState={{disabled: inactive, busy: loading}}
      disabled={inactive}
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
        fullWidth && styles.fullWidth,
        {
          backgroundColor,
          borderColor: focused ? theme.colors.focus : theme.colors.focusResting,
          borderRadius: theme.radii.control,
          paddingHorizontal: theme.spacing.lg,
        },
        variant === "secondary" &&
          (pressed || focused) && {
            backgroundColor: theme.colors.surfacePressed,
          },
        pressed && styles.pressed,
        inactive && styles.disabled,
      ]}
      {...props}>
      <View style={[styles.content, {gap: theme.spacing.sm}]}>
        {loading ? (
          <ActivityIndicator
            accessibilityElementsHidden
            color={foregroundColor}
            size={"small"}
          />
        ) : null}
        <AppText
          color={variant === "secondary" ? "textPrimary" : undefined}
          numberOfLines={1}
          style={{color: foregroundColor}}
          variant={"label"}>
          {label}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    minWidth: 48,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  fullWidth: {
    alignSelf: "stretch",
  },
  disabled: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.8,
  },
});
