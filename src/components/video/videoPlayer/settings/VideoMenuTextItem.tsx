import {Icon, IconType} from "@rneui/base";
import React, {useState} from "react";
import {Text, View} from "react-native";

import {VideoMenuItem} from "@/components/video/videoPlayer/settings/VideoMenuItem";

interface VideoMenuTextItemProps {
  selected?: boolean;
  iconType?: IconType;
  iconName?: string;
  item: string;
  onPress?: () => void;
}

export function VideoMenuTextItem({
  selected,
  item,
  iconType,
  iconName,
  onPress,
}: VideoMenuTextItemProps) {
  const [focus, setFocus] = useState(false);

  return (
    <VideoMenuItem onPress={onPress} setFocus={setFocus} focus={focus}>
      <View
        style={{
          flex: 1,
          flexDirection: "row",
          alignItems: "center",
          marginStart: 5,
        }}>
        {iconType && iconName ? (
          <Icon
            name={iconName}
            type={iconType}
            color={focus ? "black" : "white"}
            size={35}
            style={{marginEnd: 10}}
          />
        ) : null}
        <Text
          style={{
            color: focus ? "black" : "white",
            fontSize: 30,
            fontWeight: "bold",
            alignSelf: "center",
            flex: 1,
          }}>
          {item}
        </Text>
        {selected ? (
          <Icon
            name={"check"}
            type={"AntDesign"}
            color={focus ? "black" : "white"}
            size={35}
            style={{marginEnd: 10}}
          />
        ) : null}
      </View>
    </VideoMenuItem>
  );
}
