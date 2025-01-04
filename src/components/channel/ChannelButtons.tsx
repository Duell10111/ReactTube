import {StyleSheet, TouchableOpacity, View} from "react-native";
import {Button} from "react-native-paper";

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
          }}
          onPress={() => onValueChange(button.value)}>
          <Button labelStyle={{fontSize: 20}} textColor={"white"}>
            {button.label}
          </Button>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    backgroundColor: "grey",
    borderRadius: 25,
    overflow: "hidden",
  },
});
