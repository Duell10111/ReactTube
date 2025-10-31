import {deviceType, DeviceType} from "expo-device";
import {Platform, StyleProp, ViewStyle} from "react-native";

import {GridFeedPhone} from "@/components/grid/GridFeedPhone";
import GridFeedView from "@/components/grid/GridFeedView";
import {HorizontalData} from "@/extraction/ShelfExtraction";
import {ElementData} from "@/extraction/Types";

interface GridFeedPhoneWrapperProps {
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  items: (ElementData | HorizontalData)[];
  onEndReached?: () => void;
}

export function GridFeedPhoneWrapper(props: GridFeedPhoneWrapperProps) {
  if (deviceType === DeviceType.TABLET || Platform.isTV) {
    return <GridFeedView {...props} />;
  }

  return <GridFeedPhone {...props} />;
}
