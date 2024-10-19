import {Icon, IconType} from "@rneui/base";
import {useState} from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import {useAppStyle} from "@/context/AppStyleContext";

interface PlaylistHeaderButtonProps {
  iconName: string;
  iconType: IconType;
  text?: string;
  onPress?: () => void;
  backgroundColor?: string;
  textColor?: string;
}

export function PlaylistHeaderButton({
  text,
  iconType,
  iconName,
  onPress,
  backgroundColor,
  textColor,
}: PlaylistHeaderButtonProps) {
  const {style} = useAppStyle();

  return (
    <TouchableOpacity
      style={[styles.container, {backgroundColor}]}
      onPress={onPress}>
      <View style={styles.contentContainer}>
        <Icon name={iconName} type={iconType} color={textColor ?? "white"} />
        {text ? (
          <Text
            style={[styles.textStyle, {color: textColor ?? style.textColor}]}>
            {text}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    // borderWidth: 5,
    padding: 13,
    borderRadius: 25,
  },
  contentContainer: {
    flexDirection: "row",
  },
  textStyle: {
    fontSize: 20,
    marginStart: 10,
  },
});
