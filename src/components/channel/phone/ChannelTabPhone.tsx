import {MaterialTopTabScreenProps} from "@react-navigation/material-top-tabs";
import {useMemo} from "react";

import {useChannelContext} from "@/components/channel/phone/ChannelContext";
import {ChannelTab} from "@/components/channel/phone/ChannelTab";
import {RootChannelTabParamList} from "@/components/channel/phone/ChannelTabs";
import {ChannelTabType} from "@/hooks/channel/useChannelTab";

type Props = MaterialTopTabScreenProps<RootChannelTabParamList>;

export function ChannelTabPhone({navigation, route}: Props) {
  const type = useMemo<ChannelTabType>(() => {
    switch (route.name) {
      case "Home":
      default:
        return "Home";
      case "Videos":
        return "Videos";
      case "Shorts":
        return "Shorts";
      case "Playlists":
        return "Playlists";
    }
  }, [route]);
  const {channel} = useChannelContext();

  return <ChannelTab channel={channel} type={type} />;
}
