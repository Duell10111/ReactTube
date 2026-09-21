import {MaterialIcons} from "@expo/vector-icons";
import {Image} from "expo-image";
import {useState} from "react";
import {Pressable, StyleSheet} from "react-native";

import {useAppTheme} from "@/ui/theme";

type MaterialIconName = React.ComponentProps<typeof MaterialIcons>["name"];

interface MetadataButtonProps {
  imageUrl?: string;
  /** Material icon name; the avatar variant is used when this is left out. */
  icon?: string;
  accessibilityLabel: string;
  onPress?: () => void;
  onFocus?: () => void;
  active?: boolean;
}

/**
 * One action of the TV player overlay. Focus is an outline plus a filled
 * surface, the same pair the TV media card uses, so a remote never has to
 * guess which control it is on.
 */
export function MetadataButton({
  imageUrl,
  icon,
  accessibilityLabel,
  onPress,
  onFocus,
  active,
}: MetadataButtonProps) {
  const {theme} = useAppTheme();
  const [focused, setFocused] = useState(false);
  const foreground = focused
    ? theme.colors.background
    : active
      ? theme.colors.background
      : theme.colors.textPrimary;

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={"button"}
      accessibilityState={{selected: Boolean(active)}}
      onBlur={() => setFocused(false)}
      onFocus={() => {
        setFocused(true);
        onFocus?.();
      }}
      onPress={onPress}
      style={[
        styles.container,
        {
          marginHorizontal: theme.spacing.xs,
          borderRadius: theme.radii.round,
          borderColor: focused ? theme.colors.focus : theme.colors.focusResting,
          backgroundColor:
            focused || active ? theme.colors.textPrimary : theme.colors.scrim,
        },
      ]}>
      {icon ? (
        <MaterialIcons
          color={foreground}
          name={icon as MaterialIconName}
          size={28}
        />
      ) : (
        <Image
          accessibilityIgnoresInvertColors
          source={imageUrl ? {uri: imageUrl} : undefined}
          style={styles.imageStyle}
        />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 55,
    aspectRatio: 1,
    borderWidth: 3,
    justifyContent: "center",
    alignItems: "center",
  },
  imageStyle: {
    width: "90%",
    aspectRatio: 1,
    borderRadius: 50,
  },
});
