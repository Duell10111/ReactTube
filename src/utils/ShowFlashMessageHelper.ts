import {Platform} from "react-native";
import {
  MessageOptions,
  showMessage as nativeShowMessage,
} from "react-native-flash-message";

import {describeError} from "./describeError";

type ShowMessageOptions = Omit<MessageOptions, "description"> & {
  // Callers often forward caught errors; they are converted to text here.
  description?: unknown;
};

export function showMessage({description, ...options}: ShowMessageOptions) {
  nativeShowMessage({
    // Keep the string position: a custom object position skips the safe-area
    // inset that the root FlashMessage applies via `statusBarHeight`.
    position: "top",
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
    ...options,
    description: describeError(description),
  });
}
