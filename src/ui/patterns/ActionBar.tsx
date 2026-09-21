import {MaterialIcons} from "@expo/vector-icons";
import React, {useState} from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import {AppText} from "@/ui/components";
import {useAppTheme} from "@/ui/theme";

type MaterialIconName = React.ComponentProps<typeof MaterialIcons>["name"];

export interface ActionBarItem {
  id: string;
  label: string;
  /** Material icon name. Kept as a string so the view models stay UI-free. */
  icon: string;
  /** The action reflects a state the user has set, such as a rating. */
  active?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
  onPress: () => void;
}

interface ActionBarProps {
  items: ActionBarItem[];
  /** Hides the labels where vertical space is scarce, such as phone landscape. */
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * One row of video actions. Every action carries an icon and a text label, so
 * like, save, or download are readable instead of guessable, and the row
 * scrolls instead of dropping the actions that do not fit.
 */
export function ActionBar({items, compact, style, testID}: ActionBarProps) {
  const {theme} = useAppTheme();

  return (
    <ScrollView
      contentContainerStyle={[
        styles.content,
        {gap: theme.spacing.sm, paddingHorizontal: theme.spacing.sm},
      ]}
      horizontal
      showsHorizontalScrollIndicator={false}
      style={style}
      testID={testID ?? "action-bar"}>
      {items.map(item => (
        <ActionBarButton compact={compact} item={item} key={item.id} />
      ))}
    </ScrollView>
  );
}

interface ActionBarButtonProps {
  item: ActionBarItem;
  compact?: boolean;
}

function ActionBarButton({item, compact}: ActionBarButtonProps) {
  const {theme} = useAppTheme();
  const [focused, setFocused] = useState(false);
  const foreground = item.disabled
    ? theme.colors.textDisabled
    : item.active
      ? theme.colors.background
      : theme.colors.textPrimary;

  return (
    <Pressable
      accessibilityLabel={item.accessibilityLabel ?? item.label}
      accessibilityRole={"button"}
      accessibilityState={{
        disabled: Boolean(item.disabled),
        selected: Boolean(item.active),
      }}
      disabled={item.disabled}
      onBlur={() => setFocused(false)}
      onFocus={() => setFocused(true)}
      onPress={item.onPress}
      style={({pressed}) => [
        styles.button,
        {
          gap: theme.spacing.sm,
          borderRadius: theme.radii.round,
          paddingHorizontal: compact ? theme.spacing.md : theme.spacing.lg,
          borderColor: focused ? theme.colors.focus : theme.colors.focusResting,
          backgroundColor: item.active
            ? theme.colors.textPrimary
            : pressed || focused
              ? theme.colors.surfacePressed
              : theme.colors.surfaceRaised,
        },
        item.disabled && styles.disabled,
      ]}>
      <MaterialIcons
        color={foreground}
        name={item.icon as MaterialIconName}
        size={Platform.isTV ? 28 : 20}
      />
      {compact ? null : (
        <AppText
          numberOfLines={1}
          style={{color: foreground}}
          variant={"label"}>
          {item.label}
        </AppText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    flexDirection: "row",
    alignItems: "center",
  },
  button: {
    minHeight: 48,
    minWidth: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
  },
  disabled: {
    opacity: 0.45,
  },
});
