import {ReactElement, type ComponentProps} from "react";
import {ViewStyle} from "react-native";
import type Video from "react-native-video";

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
  videoProps: ComponentProps<typeof Video>;
}
