import React, {useState} from "react";
import {Modal, StyleSheet, Text, View} from "react-native";
import {ListItem} from "@rneui/base";
import {useNavigation} from "@react-navigation/native";
import {NativeStackProp} from "../../navigation/types";
import useVideoDetails from "../../hooks/useVideoDetails";
import {useShelfVideoSelector} from "../../context/ShelfVideoSelector";

interface Props {
  selectedVideoId?: string;
}

// TODO: Add focus feedback

export default function VideoMenu() {
  const {selectedVideo, setSelectedVideo} = useShelfVideoSelector();

  return (
    <Modal
      visible={selectedVideo !== undefined}
      transparent
      onRequestClose={() => setSelectedVideo()}>
      <View style={styles.container}>
        {selectedVideo ? (
          <VideoMenuContent
            videoId={selectedVideo}
            onCloseModal={() => setSelectedVideo(undefined)}
          />
        ) : null}
      </View>
    </Modal>
  );
}

function VideoMenuContent({
  videoId,
  onCloseModal,
}: {
  videoId: string;
  onCloseModal: () => void;
}) {
  const navigation = useNavigation<NativeStackProp>();
  const {Video} = useVideoDetails(videoId);
  console.log("VideoInfo: ", JSON.stringify(Video?.basic_info, null, 4));
  return (
    <VideoMenuItem
      title={"To Channel"}
      onPress={() => {
        if (Video?.basic_info.channel?.id) {
          navigation.navigate("ChannelScreen", {
            channelId: Video?.basic_info.channel?.id,
          });
          onCloseModal();
        }
      }}
    />
  );
}

interface ItemProps {
  title: string;
  onPress: () => void;
}

function VideoMenuItem({title, onPress}: ItemProps) {
  const [focus, setFocus] = useState(false);
  return (
    <ListItem
      onFocus={() => setFocus(true)}
      onBlur={() => setFocus(false)}
      containerStyle={[{backgroundColor: "transparent"}]}
      onPress={onPress}>
      <ListItem.Title style={{flex: 1, color: focus ? "white" : "black"}}>
        {title}
      </ListItem.Title>
      <ListItem.Chevron />
    </ListItem>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "red",
    width: "20%",
    height: "100%",
    alignSelf: "flex-end",
  },
});
