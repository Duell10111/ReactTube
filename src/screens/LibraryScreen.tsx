import React from "react";
import {Platform} from "react-native";

import {LibraryScreen} from "@/components/screens/phone/LibraryScreen";
import {LibraryScreenTV} from "@/screens/LibraryScreenTV";

export default function LibraryDrawerItem() {
  if (Platform.isTV) {
    return <LibraryScreenTV />;
  }

  return <LibraryScreen />;
}
