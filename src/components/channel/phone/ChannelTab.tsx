import DeviceInfo from "react-native-device-info";

import {GridFeedPhone} from "@/components/grid/GridFeedPhone";
import GridFeedViewPhone from "@/components/grid/GridFeedViewPhone";
import {YTChannel} from "@/extraction/Types";
import useChannelTab, {ChannelTabType} from "@/hooks/channel/useChannelTab";

interface ChannelTabProps {
  channel: YTChannel;
  type: ChannelTabType;
}

export function ChannelTab({channel, type}: ChannelTabProps) {
  const {data, fetchMore} = useChannelTab(channel, type);

  if (!data) return null;

  return (
    <>
      {/*<Text style={{color: "white"}}>{`Channel Tab: ${type}`}</Text>*/}
      {type === "Shorts" || (type === "Videos" && DeviceInfo.isTablet()) ? (
        <GridFeedViewPhone
          items={data}
          onEndReached={() => fetchMore()}
          itemDimension={type === "Shorts" ? 150 : 300}
        />
      ) : (
        <GridFeedPhone items={data} onEndReached={() => fetchMore()} />
      )}
    </>
  );
}
