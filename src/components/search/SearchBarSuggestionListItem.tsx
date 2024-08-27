import {Text, TouchableHighlight} from "react-native";

interface SearchBarSuggestionListItemProps {
  text: string;
  onPress?: () => void;
}

export function SearchBarSuggestionListItem({
  text,
  onPress,
}: SearchBarSuggestionListItemProps) {
  return (
    <TouchableHighlight
      style={{
        width: "100%",
        height: 50,
        borderBottomColor: "white",
        borderBottomWidth: 1,
        justifyContent: "center",
      }}
      onPress={onPress}>
      <Text style={{color: "white"}}>{text}</Text>
    </TouchableHighlight>
  );
}
