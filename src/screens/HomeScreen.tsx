import React from "react";
import {ScrollView} from "react-native";
import useHomeScreen from "../hooks/useHomeScreen";
import PageSegment from "../components/PageSegment";

export default function HomeScreen() {
  const homeScreen = useHomeScreen();

  return (
    <ScrollView>
      {homeScreen?.segments.map(segment => (
        <PageSegment segment={segment} />
      ))}
    </ScrollView>
  );
}
