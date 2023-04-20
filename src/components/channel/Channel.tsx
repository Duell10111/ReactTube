import React from "react";
import {Text, View} from "react-native";
import {YT, YTNodes} from "../../utils/Youtube";
import useChannelData, {
  ChannelContentTypes,
} from "../../hooks/channel/useChannelData";
import Logger from "../../utils/Logger";
import {recursiveTypeLogger} from "../../utils/YTNodeLogger";
import SectionList from "./SectionList";
import {ButtonGroup} from "@rneui/base";

const LOGGER = Logger.extend("CHANNEL");

interface Props {
  channel: YT.Channel;
}

export default function Channel({channel}: Props) {
  const buttons = [
    {
      element: () => <Text>Home</Text>,
    },
    {
      element: () => <Text>Videos</Text>,
    },
  ];

  return (
    <View style={{backgroundColor: "yellow", flex: 1}}>
      <ButtonGroup buttons={buttons} />
      <View style={{backgroundColor: "orange", flex: 1}}>
        {channel.has_home ? (
          <ChannelRow channel={channel} type={"Home"} />
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
  const {data} = useChannelData(channel, type);

  LOGGER.debug(data ? recursiveTypeLogger([data.page_contents]) : "");

  if (data?.page_contents.is(YTNodes.SectionList)) {
    return <SectionList node={data?.page_contents} />;
  } else {
    LOGGER.warn("Unsupported Channel Type: ", data?.page_contents);
  }

  return (
    <View>
      <Text>Unsupported Channel Type</Text>
    </View>
  );
}
