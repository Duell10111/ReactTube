import {MaterialIcons} from "@expo/vector-icons";
import React from "react";

import {AppListItem} from "@/ui/components";

interface VideoMenuTextItemProps {
  selected?: boolean;
  iconName?: React.ComponentProps<typeof MaterialIcons>["name"];
  item: string;
  onPress?: () => void;
}

export function VideoMenuTextItem({
  selected,
  item,
  iconName,
  onPress,
}: VideoMenuTextItemProps) {
  return (
    <AppListItem
      icon={iconName}
      onPress={onPress}
      selected={selected}
      title={item}
    />
  );
}
