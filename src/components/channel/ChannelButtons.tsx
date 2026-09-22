import {StyleSheet, View} from "react-native";

import {Chip} from "@/ui/components";
import {useAppTheme} from "@/ui/theme";

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

  return (
    <View
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
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
});
