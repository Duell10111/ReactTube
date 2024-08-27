import React, {forwardRef, useMemo} from "react";
import {VLCPlayer} from "react-native-vlc-media-player";

// TODO: Refactor to new Overlay Player and remove the old one

// @ts-ignore
type Props = React.ComponentPropsWithRef<VLCPlayer>;

const VLCPlayerWrapper = forwardRef<VLCPlayer, Props>((props, ref) => {
  // Disable rerender to not cause any errors

  // @ts-ignore
  return useMemo(() => <VLCPlayer {...props} ref={ref} />, []);
});

export default VLCPlayerWrapper;
