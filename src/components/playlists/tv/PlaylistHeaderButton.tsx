import {Icon, IconType} from "@rneui/base";
import {useState} from "react";
import {Pressable, StyleSheet, Text, View} from "react-native";

import {useAppStyle} from "@/context/AppStyleContext";

interface PlaylistHeaderButtonProps {
  iconName: string;
  iconType: IconType;
  text: string;
  onPress?: () => void;
}

export function PlaylistHeaderButton({
  text,
  iconType,
  iconName,
  onPress,
}: PlaylistHeaderButtonProps) {
  const {style} = useAppStyle();
  const [focus, setFocus] = useState(false);

  return (
    <Pressable
      style={[
        styles.container,
        {backgroundColor: focus ? "#888888" : undefined},
      ]}
      onFocus={() => setFocus(true)}
      onBlur={() => setFocus(false)}
      onPress={onPress}>
      <View style={styles.contentContainer}>
        <Icon name={iconName} type={iconType} color={"white"} />
        <Text style={[styles.textStyle, {color: style.textColor}]}>{text}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    // borderWidth: 5,
    padding: 13,
    borderRadius: 5,
  },
  contentContainer: {
    flexDirection: "row",
  },
  textStyle: {
    fontSize: 20,
    marginStart: 10,
  },
});
