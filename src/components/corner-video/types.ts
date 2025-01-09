import {ReactElement} from "react";
import {ViewStyle} from "react-native";
import type {VideoNativeProps} from "react-native-video";

// VideoProvider

export type Measure = {
  w: number;
  h: number;
  x: number;
  y: number;
};

// CornerVideo

export interface CornerVideoProps {
  style?: ViewStyle;
  onPress?: () => void;
  children?: ReactElement;
  cornerProps: {
    width: number;
    height: number;
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  videoProps: VideoNativeProps;
}
