import {createMaterialTopTabNavigator} from "@react-navigation/material-top-tabs";

import {ChannelTabPhone} from "@/components/channel/phone/ChannelTabPhone";
import {YTChannelTabType} from "@/extraction/Types";

export type RootChannelTabParamList = {
  Home: undefined;
  Videos: undefined;
  Playlists: undefined;
  Shorts: undefined;
  About: undefined;
};

const Tab = createMaterialTopTabNavigator<RootChannelTabParamList>();

interface ChannelTabsProps {
  channelTypes: YTChannelTabType[];
}

export function ChannelTabs({channelTypes}: ChannelTabsProps) {
  return (
    <Tab.Navigator>
      {/* TODO: Check if Type exists in Param List and filter outer out*/}
      {channelTypes.map((channel: YTChannelTabType) => (
        <Tab.Screen key={channel} name={channel} component={ChannelTabPhone} />
      ))}
    </Tab.Navigator>
  );
}
