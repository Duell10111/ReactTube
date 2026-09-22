import React from "react";
import {Image, Platform, StyleSheet, View} from "react-native";

import {AppText} from "@/ui/components";
import {useAppTheme} from "@/ui/theme";

interface Props {
  channelName: string;
  imgURL: string;
}

export default function ChannelHeader({imgURL, channelName}: Props) {
  const {theme} = useAppTheme();
  return (
    <View
      style={[
        styles.touchContainer,
        {gap: theme.spacing.lg, padding: theme.spacing.xl},
      ]}>
      <Image
        source={{uri: imgURL}}
        style={[
          styles.img,
          {backgroundColor: theme.colors.surfaceRaised},
          Platform.isTV && styles.imgTV,
        ]}
      />
      <AppText style={styles.channelTitle} variant={"titleLarge"}>
        {channelName}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  touchContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  img: {
    borderRadius: 999,
    width: 88,
    height: 88,
  },
  imgTV: {
    width: 128,
    height: 128,
  },
  channelTitle: {
    flex: 1,
  },
});
