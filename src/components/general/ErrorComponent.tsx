import React from "react";

import {ErrorState} from "@/ui/components";

interface Props {
  text?: string;
}

export default function ErrorComponent({text}: Props) {
  return <ErrorState message={text} />;
}
