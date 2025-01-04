import {useNavigation} from "@react-navigation/native";
import React, {createContext, useContext, useState} from "react";

import {ElementData} from "@/extraction/Types";
import {RootNavProp} from "@/navigation/RootStackNavigator";

interface ShelfVideo {
  selectedVideo?: ElementData;
}

interface ShelfVideoContext extends ShelfVideo {
  setSelectedVideo: (video?: ElementData) => void;
  onElementFocused?: () => void;
}

const defaultValue: ShelfVideoContext = {
  setSelectedVideo: () => {},
};

const ShelfVideoContext = createContext<ShelfVideoContext>(defaultValue);

interface Props {
  children: React.ReactNode;
  onElementFocused?: () => void;
}

export default function ShelfVideoSelectorProvider({
  children,
  onElementFocused,
}: Props) {
  // TODO: Remove State as not used anymore
  const [shelfData, setShelfData] = useState<ShelfVideo>({});
  const navigation = useNavigation<RootNavProp>();

  const value: ShelfVideoContext = {
    ...shelfData,
    setSelectedVideo: video => {
      // setShelfData({
      //   selectedVideo: video,
      // });
      // setTimeout(() => {
      //   navigation.navigate("VideoMenuContext");
      // }, 1000);
      if (video) {
        navigation.navigate("VideoMenuContext", {element: video});
      }
    },
    onElementFocused,
  };

  return <ShelfVideoContext.Provider value={value} children={children} />;
}

export function useShelfVideoSelector() {
  return useContext(ShelfVideoContext);
}
