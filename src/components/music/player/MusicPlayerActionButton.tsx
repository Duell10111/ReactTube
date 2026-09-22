import {Icon, IconType} from "@rneui/base";
import {Pressable, StyleSheet} from "react-native";

import {AppText} from "@/ui/components";
import {useAppTheme} from "@/ui/theme";

interface MusicPlayerActionButtonProps {
  iconName?: string;
  iconType?: IconType;
  title?: string;
  color?: string;
  onPress?: () => void;
}

export function MusicPlayerActionButton({
  iconName,
  iconType,
  title,
  onPress,
}: MusicPlayerActionButtonProps) {
  const {theme} = useAppTheme();

  return (
    <Pressable
      accessibilityLabel={title}
      accessibilityRole={"button"}
      onPress={onPress}
      style={({pressed}) => [
        styles.container,
        {
          backgroundColor: pressed
            ? theme.colors.surfacePressed
            : theme.colors.surfaceRaised,
          borderRadius: theme.radii.control,
          gap: theme.spacing.xs,
          paddingHorizontal: theme.spacing.md,
        },
      ]}>
      {iconName && iconType ? (
        <Icon
          name={iconName}
          type={iconType}
          color={theme.colors.textPrimary}
        />
      ) : null}
      <AppText variant={"label"}>{title}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 0,
    flexDirection: "row",
    alignItems: "center",
    minHeight: 48,
    paddingVertical: 5,
  },
});
