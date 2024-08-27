import AntDesign from "@expo/vector-icons/AntDesign";
import React from "react";
import {StyleSheet, Text, TouchableOpacity} from "react-native";
import Animated, {
  SharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";

interface EndCardContainerProps {
  children: React.ReactNode;
  showEndCard: SharedValue<boolean>;
  onCloseEndCard?: () => void;
}

export default function EndCardContainer({
  children,
  showEndCard,
  onCloseEndCard,
}: EndCardContainerProps) {
  const containerStyle = useAnimatedStyle(() => {
    return {
      opacity: withTiming(showEndCard.value ? 1 : 0),
    };
  });

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      {children}
      <TouchableOpacity style={styles.closeContainer} onPress={onCloseEndCard}>
        <>
          <Text style={styles.closeText}>{"Close"}</Text>
          <AntDesign name={"down"} size={35} color={"white"} />
        </>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  // Close Container
  closeContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  closeText: {
    color: "white",
    fontSize: 20,
  },
});
