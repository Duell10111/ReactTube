import _ from "lodash";
import React, {useMemo, useState} from "react";
import {View} from "react-native";

import useChannelData, {
  ChannelContentTypes,
} from "../../hooks/channel/useChannelData";
import Logger from "../../utils/Logger";
import {YT, YTNodes} from "../../utils/Youtube";

import ChannelButtons from "@/components/channel/ChannelButtons";
import {extractSectionList} from "@/extraction/CustomListExtractors";
import {useTranslation} from "@/localization";
import {EmptyState} from "@/ui/components";
import {MediaFeed} from "@/ui/patterns";
import {useAppTheme} from "@/ui/theme";

const LOGGER = Logger.extend("CHANNEL");

interface Props {
  channel: YT.Channel;
}

export default function Channel({channel}: Props) {
  const [selected, setSelected] = useState<ChannelContentTypes>("Home");
  const {t} = useTranslation();
  const {theme} = useAppTheme();
  const buttons = useMemo(
    () =>
      _.compact([
        {
          label: t("channel.tab.home"),
          value: "Home" as ChannelContentTypes,
        },
        channel.has_videos
          ? {
              label: t("channel.tab.videos"),
              value: "Videos" as ChannelContentTypes,
            }
          : null,
        channel.has_shorts
          ? {
              label: t("channel.tab.shorts"),
              value: "Reels" as ChannelContentTypes,
            }
          : null,
        channel.has_playlists
          ? {
              label: t("channel.tab.playlists"),
              value: "Playlists" as ChannelContentTypes,
            }
          : null,
      ]),
    [channel, t],
  );

  return (
    <View style={{flex: 1}}>
      <ChannelButtons
        buttons={buttons}
        value={selected}
        // @ts-ignore
        onValueChange={setSelected}
      />
      <View style={{flex: 1, marginTop: theme.spacing.md}}>
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
  const {data, nodes, parsedData, fetchMore} = useChannelData(channel, type);

  if (data?.page_contents && data.page_contents.is(YTNodes.SectionList)) {
    return (
      <MediaFeed
        items={extractSectionList(data.page_contents)}
        onEndReached={fetchMore}
      />
    );
  } else if (Array.isArray(nodes)) {
    return (
      <MediaFeed items={parsedData} loading={!data} onEndReached={fetchMore} />
    );
  } else {
    LOGGER.warn("Unsupported Channel Type: ", data?.page_contents);
  }

  return <EmptyState />;
}
