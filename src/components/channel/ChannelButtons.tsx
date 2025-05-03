import {StyleSheet, Text, TouchableOpacity, View} from "react-native";

interface ButtonValue {
  value: string;
  label: string;
}

interface ChannelButtonsProps {
  value: string;
  onValueChange: (value: string) => void;
  buttons: ButtonValue[];
}

export default function ChannelButtons({
  buttons,
  onValueChange,
  value,
}: ChannelButtonsProps) {
  return (
    <View style={styles.row}>
      {buttons.map((button, index) => (
        <TouchableOpacity
          key={button.value}
          style={{
            backgroundColor: value === button.value ? "lightblue" : undefined,
            borderEndWidth: index === buttons.length - 1 ? undefined : 2,
            borderColor: "white",
            flex: 1,
            alignItems: "center",
          }}
          onPress={() => onValueChange(button.value)}>
          <Text
            style={{
              fontSize: 30,
              fontWeight: "bold",
              color: "white",
              padding: 5,
            }}>
            {button.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    backgroundColor: "#222222",
    borderRadius: 25,
    overflow: "hidden",
  },
});
