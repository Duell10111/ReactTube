import React from "react";
import {View} from "react-native";
import {useSafeAreaInsets} from "react-native-safe-area-context";

import {SectionFeedPhone} from "@/components/history/SectionFeedPhone";
import useHistory from "@/hooks/useHistory";

export function HistoryScreen() {
  const {content, fetchMore, parsedContent} = useHistory();
  const {bottom, left, right} = useSafeAreaInsets();

  console.log(parsedContent);

  return (
    <View
      style={{
        flex: 1,
        paddingBottom: bottom,
        paddingLeft: left,
        paddingRight: right,
      }}>
      <SectionFeedPhone
        items={parsedContent}
        onEndReached={() => fetchMore().catch(console.warn)}
      />
    </View>
  );
}
