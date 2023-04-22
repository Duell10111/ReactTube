import React, {useState} from "react";
import {YT} from "../../utils/Youtube";
import {Modal, StyleSheet, Text, TouchableOpacity, View} from "react-native";
import HorizontalVideoList from "../HorizontalVideoList";
import FastImage from "react-native-fast-image";
import ChannelIcon from "./ChannelIcon";

interface Props {
  video: YT.VideoInfo;
  visible: boolean;
  onCloseRequest: () => void;
}

// TODO: Add autoplay for next video

export default function EndCard({visible, onCloseRequest, video}: Props) {
  if (!video.watch_next_feed) {
    // TODO: Add warning or debug message
    return null;
  }

  return (
    <Modal
      visible={visible}
      onRequestClose={() => onCloseRequest()}
      transparent>
      <View style={styles.touchContainer}>
        <View style={styles.nextVideoContainer}>
          <Text style={styles.text}>Nächstes Video</Text>
        </View>
        <ChannelIcon channelId={video.basic_info.channel_id ?? ""} />
        <View style={styles.bottomContainer}>
          <Text style={styles.bottomText}>Related Videos</Text>
          <HorizontalVideoList
            nodes={video.watch_next_feed}
            textStyle={{color: "white"}}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  touchContainer: {
    backgroundColor: "#11111199",
    flex: 1,
    justifyContent: "flex-end",
  },
  text: {
    color: "white",
  },
  nextVideoContainer: {
    flex: 1,
  },
  bottomText: {
    fontSize: 18,
    paddingStart: 20,
    color: "white",
  },
  bottomContainer: {
    width: "100%",
    minHeight: "40%",
    backgroundColor: "#111111cc",
    justifyContent: "center",
    paddingTop: 20,
  },
});
