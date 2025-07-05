import {Feather} from "@expo/vector-icons";
import {StyleSheet, TouchableOpacity, View, Text} from "react-native";
import {useAppData} from "@/context/AppDataContext";
import {useAppStyle} from "@/context/AppStyleContext";

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
  const {appSettings} = useAppData();
  const {style: appStyle} = useAppStyle();
  const scale = appSettings.uiScale ?? 1;
  return (
    <View
      style={[
        styles.rowWrapper,
        styles.rowFirst,
        {borderColor: appStyle.backgroundColorAlpha},
      ]}>
      <TouchableOpacity onPress={onPress} style={styles.row}>
        <View style={[styles.rowIcon, {backgroundColor: iconBackground}]}>
          <Feather
            color={"#fff"}
            // @ts-ignore
            name={icon}
            size={20}
          />
        </View>

        <Text
          style={[
            styles.rowLabel,
            {fontSize: 17 * scale, color: appStyle.textColor},
          ]}>
          {label}
        </Text>

        <View style={styles.rowSpacer} />

        <Text
          style={[
            styles.rowValue,
            {fontSize: 17 * scale, color: appStyle.textColor},
          ]}>
          {value}
        </Text>

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
  const {appSettings} = useAppData();
  const {style: appStyle} = useAppStyle();
  const scale = appSettings.uiScale ?? 1;
  return (
    <View
      style={[
        styles.rowWrapper,
        styles.rowFirst,
        {borderColor: appStyle.backgroundColorAlpha},
      ]}>
      <TouchableOpacity onPress={onPress} style={styles.row}>
        <Text
          style={[
            styles.rowLabel,
            {fontSize: 17 * scale, color: appStyle.textColor},
          ]}>
          {label}
        </Text>

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
  const {appSettings} = useAppData();
  const {style: appStyle} = useAppStyle();
  const scale = appSettings.uiScale ?? 1;
  return (
    <View
      style={[
        styles.rowWrapper,
        styles.rowFirst,
        {borderColor: appStyle.backgroundColorAlpha},
      ]}>
      <TouchableOpacity onPress={onPress} style={styles.row}>
        <View style={[styles.rowIcon, {backgroundColor: iconBackground}]}>
          <Feather
            color={"#fff"}
            // @ts-ignore
            name={icon}
            size={20}
          />
        </View>
        <Text
          style={[
            styles.rowLabel,
            {fontSize: 17 * scale, color: appStyle.textColor},
          ]}>
          {label}
        </Text>

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
  const {appSettings} = useAppData();
  const {style: appStyle} = useAppStyle();
  const scale = appSettings.uiScale ?? 1;
  return (
    <View
      style={[
        styles.rowWrapper,
        styles.rowFirst,
        {borderColor: appStyle.backgroundColorAlpha},
      ]}>
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

        <Text
          style={[
            styles.rowLabel,
            {fontSize: 17 * scale, color: appStyle.textColor},
          ]}>
          {label}
        </Text>

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
  },
  rowSpacer: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
  },
  rowValue: {
    fontSize: 17,
    fontWeight: "500",
    marginRight: 4,
  },
});
