import {Platform} from "react-native";
import {
  MessageOptions,
  showMessage as nativeShowMessage,
} from "react-native-flash-message";

export function showMessage(options: MessageOptions) {
  nativeShowMessage({
    position: {top: Platform.OS === "ios" ? 30 : 20},
    floating: true,
    animated: true,
    duration: 1000,
    style: Platform.isTV
      ? {
          width: "50%",
          alignSelf: "center",
          justifyContent: "center",
        }
      : undefined,
    titleStyle: Platform.isTV
      ? {
          fontSize: 30,
          lineHeight: 30,
        }
      : undefined,
    ...options,
  });
}
