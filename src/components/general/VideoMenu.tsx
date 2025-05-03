import {useNavigation} from "@react-navigation/native";
import {NativeStackScreenProps} from "@react-navigation/native-stack";
import {ListItem} from "@rneui/base";
import {Image} from "expo-image";
import _ from "lodash";
import React, {useMemo, useState} from "react";
import {Pressable, StyleSheet, Text, View} from "react-native";

import Logger from "../../utils/Logger";

import {VideoMenuContainer} from "@/components/general/VideoMenuContainer";
import {ElementData} from "@/extraction/Types";
import useElementData from "@/hooks/general/useElementData";
import usePlaylistManager from "@/hooks/playlist/usePlaylistManager";
import {RootStackParamList} from "@/navigation/RootStackNavigator";
import {NativeStackProp} from "@/navigation/types";

const LOGGER = Logger.extend("VIDEOMENU");

// TODO: Add focus feedback

// TODO: Outsource in other file
export function VideoMenuScreen({
  route,
}: NativeStackScreenProps<RootStackParamList, "VideoMenuContext">) {
  return (
    <VideoMenuContainer>
      <VideoMenuContent data={route.params.element} />
    </VideoMenuContainer>
  );
}

function VideoMenuContent({data: orgData}: {data: ElementData}) {
  const navigation = useNavigation<NativeStackProp>();
  const data = useElementData(orgData);
  const {executeNavEndpoint} = usePlaylistManager();

  const contextMenu = useMemo(() => {
    return "contextMenu" in data && data.contextMenu
      ? _.chain(data.contextMenu)
          .filter(
            c =>
              c.type !== "browse" &&
              c.type !== "watch" &&
              c.type !== "channel" &&
              c.type !== "feedback",
          )
          .value()
      : [];
  }, [data]);

  const channelID = useMemo(() => {
    const contextMenuChannelId =
      "contextMenu" in data
        ? data.contextMenu?.find(c => c.type === "channel")?.navEndpoint
            ?.payload.browseId
        : undefined;
    if (contextMenuChannelId) {
      return contextMenuChannelId;
    }

    return data.type === "video" || data.type === "reel"
      ? data?.author?.id
      : data.type === "channel"
        ? data.id
        : null;
  }, [data]);

  return (
    <>
      <View style={styles.infoContainer}>
        <Image
          style={styles.infoImage}
          source={{
            uri: data?.thumbnailImage?.url,
          }}
          contentFit={"contain"}
        />
        <Text style={styles.infoText}>{data?.title}</Text>
        <Text style={styles.infoSubtitle}>{data?.author?.name}</Text>
      </View>
      {channelID ? (
        <VideoMenuItem
          title={"To Channel"}
          onPress={() => {
            navigation.replace("ChannelScreen", {
              channelId: channelID,
            });
          }}
        />
      ) : null}
      {contextMenu.map(menu => (
        <VideoMenuItem
          key={menu.text}
          title={menu.text}
          onPress={() => {
            if (menu.navEndpoint && menu.type !== "addToPlaylist") {
              executeNavEndpoint(menu.navEndpoint)
                .then(() => {
                  LOGGER.debug("Executed nav endpoint for menu", menu.type);
                  navigation.goBack();
                })
                .catch(LOGGER.warn);
            } else if (menu.type === "addToPlaylist") {
              navigation.replace("PlaylistManagerContextMenu", {
                videoId: data.id,
              });
            } else {
              LOGGER.warn("No supported type");
            }
          }}
        />
      ))}
      {/* TODO: Add actions as add to watch later etc.*/}
      {/*<VideoMenuItem*/}
      {/*  title={"To Channel"}*/}
      {/*  onPress={() => {*/}
      {/*    // Sometimes the information is propagated in a different location*/}
      {/*    const channelID =*/}
      {/*      videoElement?.channel?.id ?? videoElement?.channel_id;*/}
      {/*    if (channelID) {*/}
      {/*      navigation.replace("ChannelScreen", {*/}
      {/*        channelId: channelID,*/}
      {/*      });*/}
      {/*      onCloseModal();*/}
      {/*    } else {*/}
      {/*      Logger.warn("No channel data available!");*/}
      {/*    }*/}
      {/*  }}*/}
      {/*/>*/}
    </>
  );
}

interface ItemProps {
  title: string;
  onPress: () => void;
}

function VideoMenuItem({title, onPress}: ItemProps) {
  const [focus, setFocus] = useState(false);
  return (
    <Pressable
      onFocus={() => setFocus(true)}
      onBlur={() => setFocus(false)}
      onPress={onPress}>
      <ListItem
        containerStyle={[
          styles.listItemContainer,
          {
            backgroundColor: focus
              ? "white"
              : styles.listItemContainer["backgroundColor"],
          },
        ]}>
        <ListItem.Title
          style={[styles.listItemTitle, {color: focus ? "black" : "white"}]}>
          {title}
        </ListItem.Title>
        <ListItem.Chevron />
      </ListItem>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
  },
  touchContainer: {
    backgroundColor: "#222222",
    borderRadius: 25,
    width: "25%",
    height: "95%",
    alignSelf: "flex-end",
    marginEnd: 20,
    padding: 20,
  },
  infoContainer: {
    alignSelf: "center",
    alignItems: "flex-start",
    justifyContent: "center",
    marginBottom: 10,
  },
  infoImage: {
    width: "100%",
    aspectRatio: 1.5,
    alignSelf: "center",
  },
  infoText: {
    color: "white",
    fontSize: 25,
    fontWeight: "bold",
    flexShrink: 1,
  },
  infoSubtitle: {
    color: "white",
    fontSize: 20,
    flexShrink: 1,
  },
  listItemContainer: {
    backgroundColor: "#999",
    borderRadius: 15,
    marginVertical: 3,
  },
  listItemTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: "bold",
  },
});
