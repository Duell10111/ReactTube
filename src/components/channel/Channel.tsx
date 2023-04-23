import React, {useMemo, useState} from "react";
import {Text, TouchableOpacity, View} from "react-native";
import {YT, YTNodes} from "../../utils/Youtube";
import useChannelData, {
  ChannelContentTypes,
} from "../../hooks/channel/useChannelData";
import Logger from "../../utils/Logger";
import SectionList from "./SectionList";
import {ButtonGroup, Button} from "@rneui/base";
import HomeShelf from "../HomeShelf";
import _ from "lodash";
import {useAppStyle} from "../../context/AppStyleContext";

const LOGGER = Logger.extend("CHANNEL");

interface Props {
  channel: YT.Channel;
}

export default function Channel({channel}: Props) {
  const [selected, setSelected] = useState<ChannelContentTypes>("Home");
  const {style} = useAppStyle();
  const buttons = useMemo(
    () =>
      _.compact([
        {
          element: () => <Text>Home</Text>,
          key: "Home" as ChannelContentTypes,
        },
        channel.has_videos
          ? {
              element: () => <Text>Videos</Text>,
              key: "Videos" as ChannelContentTypes,
            }
          : null,
        channel.has_shorts
          ? {
              element: () => <Text>Reels</Text>,
              key: "Reels" as ChannelContentTypes,
            }
          : null,
        channel.has_playlists
          ? {
              element: () => <Text>Playlists</Text>,
              key: "Playlists" as ChannelContentTypes,
            }
          : null,
      ]),
    [channel],
  );

  return (
    <View style={{flex: 1}}>
      <ButtonGroup
        Component={TouchableOpacity}
        selectedIndex={buttons.findIndex(value => value.key === selected)}
        buttons={buttons}
        onPress={e => setSelected(buttons[e as number].key ?? "Home")}
        selectedButtonStyle={{backgroundColor: "lightblue"}}
        buttonContainerStyle={{borderColor: "#555555"}}
        containerStyle={{backgroundColor: "#333333"}}
        buttonStyle={{backgroundColor: "#555555"}}
      />
      <View style={{flex: 1}}>
        {channel.has_home && selected === "Home" ? (
          <ChannelRow channel={channel} type={"Home"} />
        ) : null}
        {channel.has_videos && selected === "Videos" ? (
          <ChannelRow channel={channel} type={"Videos"} />
        ) : null}
        {channel.has_shorts && selected === "Reels" ? (
          <ChannelRow channel={channel} type={"Reels"} />
        ) : null}
        {channel.has_playlists && selected === "Playlists" ? (
          <ChannelRow channel={channel} type={"Playlists"} />
        ) : null}
      </View>
    </View>
  );
}

interface RowProps {
  channel: YT.Channel;
  type: ChannelContentTypes;
}

function ChannelRow({channel, type}: RowProps) {
  const {data, nodes, fetchMore} = useChannelData(channel, type);

  // LOGGER.debug(data ? recursiveTypeLogger([data.page_contents]) : "");

  if (data?.page_contents && data.page_contents.is(YTNodes.SectionList)) {
    return <SectionList node={data?.page_contents} />;
  } else if (Array.isArray(nodes)) {
    return <HomeShelf shelfItem={nodes} onEndReached={() => fetchMore()} />;
  } else {
    LOGGER.warn("Unsupported Channel Type: ", data?.page_contents);
  }

  return (
    <View>
      <Text>Unsupported Channel Type</Text>
    </View>
  );
}
