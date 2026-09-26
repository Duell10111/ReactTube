import React from "react";
import {View} from "react-native";

import {AppText} from "@/ui/components";
import {useAppTheme} from "@/ui/theme";

interface SectionTitleProps {
  title: string;
}

export function SectionTitle({title}: SectionTitleProps) {
  const {theme} = useAppTheme();

  return (
    <View
      style={{
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: theme.spacing.md,
      }}>
      <AppText accessibilityRole={"header"} variant={"titleLarge"}>
        {title}
      </AppText>
    </View>
  );
}
