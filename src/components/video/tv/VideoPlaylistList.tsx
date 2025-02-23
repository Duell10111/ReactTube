import {Icon} from "@rneui/base";
import React from "react";
import {StyleSheet, Text, TVFocusGuideView, View} from "react-native";

import {HorizontalElementsList} from "@/components/elements/tv/HorizontalElementsList";
import {ElementData} from "@/extraction/Types";

interface VideoPlaylistListProps {
  playlist: {
    title: string;
    elements: ElementData[];
  };
}

export function VideoPlaylistList({playlist}: VideoPlaylistListProps) {
  return (
    <TVFocusGuideView style={{width: "100%"}} autoFocus>
      <View style={styles.bottomPlaylistTextContainer}>
        <Icon name={"book"} color={"white"} />
        <Text style={styles.bottomPlaylistText}>{playlist.title}</Text>
      </View>
      <HorizontalElementsList elements={playlist.elements} />
    </TVFocusGuideView>
  );
}

const styles = StyleSheet.create({
  text: {
    color: "white",
  },
  bottomText: {
    fontSize: 25,
    fontWeight: "bold",
    color: "white",
    paddingStart: 20,
    paddingBottom: 15,
  },
  bottomPlaylistTextContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingStart: 20,
    paddingBottom: 15,
  },
  bottomPlaylistText: {
    fontSize: 25,
    fontWeight: "bold",
    color: "white",
    paddingStart: 10,
  },
});
