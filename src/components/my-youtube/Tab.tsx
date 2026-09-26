import {AppListItem} from "@/ui/components";

interface TabProps {
  title: string;
  onPress?: () => void;
}

export function Tab({title, onPress}: TabProps) {
  return <AppListItem onPress={onPress} title={title} />;
}
