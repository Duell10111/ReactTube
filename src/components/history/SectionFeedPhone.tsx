import React, {useCallback, useMemo} from "react";
import {
  SectionList,
  SectionListRenderItem,
  StyleProp,
  ViewStyle,
} from "react-native";

import {ElementCard} from "@/components/elements/phone/ElementCard";
import {SectionHeader} from "@/components/history/SectionHeader";
import {HorizontalData} from "@/extraction/ShelfExtraction";
import {ElementData} from "@/extraction/Types";

interface GridFeedPhoneProps {
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  items: HorizontalData[];
  onEndReached?: () => void;
}

export function SectionFeedPhone({items, onEndReached}: GridFeedPhoneProps) {
  const sections = useMemo(() => {
    return items.map(item => {
      return {
        title: item.title,
        data: item.parsedData,
      };
    });
  }, [items]);

  const renderItem = useCallback<SectionListRenderItem<ElementData>>(
    ({item}) => {
      // if ("data" in item) {
      //   return (
      //     <PageSectionList
      //       headerText={item.title}
      //       content={item as HorizontalData}
      //       // horizontalListSegmentStyle={props.horizontalListSegmentStyle}
      //     />
      //   );
      // }
      return <ElementCard element={item as ElementData} width={"100%"} />;
    },
    [],
  );

  return (
    <SectionList
      sections={sections}
      renderItem={renderItem}
      renderSectionHeader={({section: {title}}) => (
        <SectionHeader title={title} />
      )}
    />
  );
}
