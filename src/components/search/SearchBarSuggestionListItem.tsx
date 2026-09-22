import {AppListItem} from "@/ui/components";

interface SearchBarSuggestionListItemProps {
  text: string;
  onPress?: () => void;
}

export function SearchBarSuggestionListItem({
  text,
  onPress,
}: SearchBarSuggestionListItemProps) {
  return <AppListItem icon={"search"} onPress={onPress} title={text} />;
}
