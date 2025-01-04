import {StyleSheet, TouchableOpacity} from "react-native";
import {Button} from "react-native-paper";

interface TVRefreshButtonProps {
  refreshing: boolean;
  onPress: () => void;
}

export function TVRefreshButton({refreshing, onPress}: TVRefreshButtonProps) {
  return (
    <TouchableOpacity onPress={onPress}>
      <Button
        loading={refreshing}
        mode={"contained"}
        icon={"refresh"}
        labelStyle={{fontSize: 20}}>
        {"Refresh"}
      </Button>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {},
});
