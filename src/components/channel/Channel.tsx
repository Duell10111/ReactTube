import _ from "lodash";
import React, {useMemo, useState} from "react";
import {Text, View} from "react-native";

import SectionList from "./SectionList";
import useChannelData, {
  ChannelContentTypes,
} from "../../hooks/channel/useChannelData";
import useGridColumnsPreferred from "../../hooks/home/useGridColumnsPreferred";
import Logger from "../../utils/Logger";
import {YT, YTNodes} from "../../utils/Youtube";
import GridView from "../GridView";

import ChannelButtons from "@/components/channel/ChannelButtons";
import {extractSectionList} from "@/extraction/CustomListExtractors";

const LOGGER = Logger.extend("CHANNEL");

interface Props {
  channel: YT.Channel;
}

export default function Channel({channel}: Props) {
  const [selected, setSelected] = useState<ChannelContentTypes>("Home");
  const buttons = useMemo(
    () =>
      _.compact([
        {
          label: "Home",
          value: "Home" as ChannelContentTypes,
        },
        channel.has_videos
          ? {
              label: "Videos",
              value: "Videos" as ChannelContentTypes,
            }
          : null,
        channel.has_shorts
          ? {
              label: "Shorts",
              value: "Reels" as ChannelContentTypes,
            }
          : null,
        channel.has_playlists
          ? {
              label: "Playlists",
              value: "Playlists" as ChannelContentTypes,
            }
          : null,
      ]),
    [channel],
  );

  return (
    <View style={{flex: 1}}>
      <ChannelButtons
        buttons={buttons}
        value={selected}
        // @ts-ignore
        onValueChange={setSelected}
      />
      <View style={{flex: 1, marginTop: 15}}>
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
  const columns = useGridColumnsPreferred(type === "Reels");

  // LOGGER.debug(data ? recursiveTypeLogger([data.page_contents]) : "");

  if (data?.page_contents && data.page_contents.is(YTNodes.SectionList)) {
    return <SectionList node={extractSectionList(data.page_contents)} />;
  } else if (Array.isArray(nodes)) {
    return (
      <GridView
        shelfItem={nodes}
        onEndReached={() => fetchMore()}
        // TODO: Optimize
        columns={type === "Playlists" ? undefined : columns}
      />
    );
  } else {
    LOGGER.warn("Unsupported Channel Type: ", data?.page_contents);
  }

  return (
    <View>
      <Text>{"Unsupported Channel Type"}</Text>
    </View>
  );
}
