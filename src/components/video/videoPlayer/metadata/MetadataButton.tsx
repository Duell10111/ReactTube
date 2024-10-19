import {Icon, IconType} from "@rneui/base";
import {Image} from "expo-image";
import {useState} from "react";
import {StyleSheet, TouchableOpacity} from "react-native";

interface MetadataButtonProps {
  imageUrl?: string;
  iconType?: IconType;
  iconName?: string;
  onPress?: () => void;
}

export function MetadataButton({
  imageUrl,
  iconType,
  iconName,
  onPress,
}: MetadataButtonProps) {
  const [focus, setFocus] = useState(false);

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {backgroundColor: focus ? "white" : "rgba(119,119,119,0.33)"},
      ]}
      onPress={onPress}
      onFocus={() => setFocus(true)}
      onBlur={() => setFocus(false)}>
      {iconType && iconName ? (
        <Icon
          name={iconName}
          type={iconType}
          color={focus ? "black" : "white"}
        />
      ) : (
        <Image
          style={styles.imageStyle}
          source={{
            uri: imageUrl,
          }}
        />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "rgba(119,119,119,0.33)",
    borderRadius: 30,
    width: 55,
    aspectRatio: 1,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 3,
  },
  imageStyle: {
    width: "90%",
    aspectRatio: 1,
    borderRadius: 50,
  },
});
