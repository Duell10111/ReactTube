import React, {ReactNode, RefObject, useState} from "react";
import {TouchableHighlight, ViewProps} from "react-native";

import {styles} from "./styles";

interface ControlProps extends ViewProps {
  children: ReactNode;
  callback?: () => void;
  controlRef?: RefObject<React.ElementRef<typeof TouchableHighlight>>;
  disabled?: boolean;
  style?: any;
  resetControlTimeout?: () => void;
}

// TODO: Maybe for use in overlay player for phones in the future
export const Control = ({
  children,
  callback,
  controlRef,
  disabled,
  style = {},
  ...props
}: ControlProps) => {
  const [focused, setFocused] = useState(false);

  const setFocusedState = () => setFocused(true);
  const cancelFocusedState = () => setFocused(false);

  const focusedStyle = focused ? {opacity: 1} : {};

  return (
    // @ts-ignore TODO: fix
    <TouchableHighlight
      // @ts-ignore TODO: fix
      onFocus={setFocusedState}
      // @ts-ignore TODO: fix
      onBlur={cancelFocusedState}
      disabled={disabled}
      ref={controlRef}
      underlayColor={"transparent"}
      activeOpacity={1}
      onPress={() => {
        callback && callback();
      }}
      style={[styles.control, style, focused && focusedStyle]}
      {...props}>
      {children}
    </TouchableHighlight>
  );
};
