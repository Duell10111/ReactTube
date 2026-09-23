import {StyleSheet} from "react-native";

import {Chip} from "@/ui/components";
import {useAppTheme} from "@/ui/theme";
import {TVFocusRegion} from "@/ui/tv";

interface ButtonValue {
  value: string;
  label: string;
}

interface ChannelButtonsProps {
  value: string;
  onValueChange: (value: string) => void;
  buttons: ButtonValue[];
}

export default function ChannelButtons({
  buttons,
  onValueChange,
  value,
}: ChannelButtonsProps) {
  const {theme} = useAppTheme();

  // The tab row is a focus region of its own, so coming back up out of the
  // feed lands on the tab that is open instead of on the first one.
  return (
    <TVFocusRegion
      style={[
        styles.row,
        {gap: theme.spacing.sm, paddingHorizontal: theme.spacing.xl},
      ]}>
      {buttons.map(button => (
        <Chip
          key={button.value}
          label={button.label}
          onPress={() => onValueChange(button.value)}
          selected={value === button.value}
        />
      ))}
    </TVFocusRegion>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
});
