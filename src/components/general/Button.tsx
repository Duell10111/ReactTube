import {Button as OriginalButton, ButtonProps} from "@rneui/base";
import React from "react";

interface Props extends ButtonProps {}

// TV adapted general Button component
export default function Button({...props}: Props) {
  return <OriginalButton type={"outline"} {...props} />;
}
