import {Feather} from "@expo/vector-icons";
import {StyleSheet, TouchableOpacity, View, Text} from "react-native";

interface Props {
  onPress?: () => void;
  icon: string;
  iconBackground: string;
  label: string;
  value: string;
}

export default function SettingsSelectorOverview({
  onPress,
  icon,
  iconBackground,
  label,
  value,
}: Props) {
  return (
    <View style={[styles.rowWrapper, styles.rowFirst]}>
      <TouchableOpacity onPress={onPress} style={styles.row}>
        <View style={[styles.rowIcon, {backgroundColor: iconBackground}]}>
          <Feather
            color={"#fff"}
            // @ts-ignore
            name={icon}
            size={20}
          />
        </View>

        <Text style={styles.rowLabel}>{label}</Text>

        <View style={styles.rowSpacer} />

        <Text style={styles.rowValue}>{value}</Text>

        <Feather color={"#C6C6C6"} name={"chevron-right"} size={20} />
      </TouchableOpacity>
    </View>
  );
}

interface PropsSelectorItem {
  onPress?: () => void;
  label: string;
  selected: boolean;
}

export function SettingsSelectorItem({
  onPress,
  label,
  selected,
}: PropsSelectorItem) {
  return (
    <View style={[styles.rowWrapper, styles.rowFirst]}>
      <TouchableOpacity onPress={onPress} style={styles.row}>
        <Text style={styles.rowLabel}>{label}</Text>

        <View style={styles.rowSpacer} />

        {selected ? (
          <Feather color={"#C6C6C6"} name={"check"} size={20} />
        ) : null}
      </TouchableOpacity>
    </View>
  );
}

interface PropsStandaloneSelectorItem {
  onPress?: () => void;
  icon: string;
  iconBackground: string;
  label: string;
  selected: boolean;
}

export function SettingsStandaloneSelector({
  onPress,
  icon,
  iconBackground,
  label,
  selected,
}: PropsStandaloneSelectorItem) {
  return (
    <View style={[styles.rowWrapper, styles.rowFirst]}>
      <TouchableOpacity onPress={onPress} style={styles.row}>
        <View style={[styles.rowIcon, {backgroundColor: iconBackground}]}>
          <Feather
            color={"#fff"}
            // @ts-ignore
            name={icon}
            size={20}
          />
        </View>
        <Text style={styles.rowLabel}>{label}</Text>

        <View style={styles.rowSpacer} />

        {selected ? (
          <Feather color={"#C6C6C6"} name={"check"} size={20} />
        ) : null}
      </TouchableOpacity>
    </View>
  );
}

interface PropsSettingsButton {
  onPress?: () => void;
  icon?: string;
  iconBackground?: string;
  label: string;
}

export function SettingsButton({
  onPress,
  icon,
  iconBackground,
  label,
}: PropsSettingsButton) {
  return (
    <View style={[styles.rowWrapper, styles.rowFirst]}>
      <TouchableOpacity onPress={onPress} style={styles.row}>
        {icon && iconBackground ? (
          <View style={[styles.rowIcon, {backgroundColor: iconBackground}]}>
            <Feather
              color={"#fff"}
              // @ts-ignore
              name={icon}
              size={20}
            />
          </View>
        ) : null}

        <Text style={styles.rowLabel}>{label}</Text>

        <View style={styles.rowSpacer} />
      </TouchableOpacity>
    </View>
  );
}

// <View style={styles.rowWrapper}>
//   <View style={styles.row}>
//     <View
//       style={[styles.rowIcon, { backgroundColor: '#007AFF' }]}>
//       <FeatherIcon
//         color="#fff"
//         name="moon"
//         size={20} />
//     </View>
//
//     <Text style={styles.rowLabel}>Dark Mode</Text>
//
//     <View style={styles.rowSpacer} />
//
//     <Switch
//       onValueChange={emailNotifications =>
//         setForm({ ...form, emailNotifications })
//       }
//       value={form.emailNotifications} />
//   </View>
// </View>

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    paddingRight: 24,
    height: 50,
  },
  rowWrapper: {
    borderTopWidth: 1,
    borderColor: "#e3e3e3",
  },
  rowFirst: {
    borderTopWidth: 0,
  },
  rowIcon: {
    width: 30,
    height: 30,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  rowLabel: {
    fontSize: 17,
    fontWeight: "500",
    color: "#000",
  },
  rowSpacer: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
  },
  rowValue: {
    fontSize: 17,
    fontWeight: "500",
    color: "#8B8B8B",
    marginRight: 4,
  },
});
