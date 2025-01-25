import ChannelHeader from "@/components/channel/ChannelHeader";
import {ChannelContext} from "@/components/channel/phone/ChannelContext";
import {ChannelTabs} from "@/components/channel/phone/ChannelTabs";
import {YTChannel} from "@/extraction/Types";

interface Props {
  channel: YTChannel;
}

export function Channel({channel}: Props) {
  return (
    <>
      <ChannelHeader
        channelName={channel.title ?? "Unknown Channel title"}
        imgURL={channel.thumbnail.url}
      />
      <ChannelContext channel={channel}>
        <ChannelTabs channelTypes={channel.tabTypes} />
      </ChannelContext>
    </>
  );
}
