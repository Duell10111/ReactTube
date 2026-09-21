import {Feather} from "@expo/vector-icons";
import React from "react";
import {StyleSheet, Text, TouchableOpacity, View} from "react-native";

import {useAppTheme} from "@/ui/theme";

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
  const {theme} = useAppTheme();

  return (
    <RowWrapper>
      <TouchableOpacity
        accessibilityLabel={`${label}, ${value}`}
        accessibilityRole={"button"}
        onPress={onPress}
        style={styles.row}>
        <View style={[styles.rowIcon, {backgroundColor: iconBackground}]}>
          <Feather
            color={theme.colors.textPrimary}
            // @ts-ignore The icon name is supplied by the settings descriptor.
            name={icon}
            size={20}
          />
        </View>
        <Text style={[styles.rowLabel, {color: theme.colors.textPrimary}]}>
          {label}
        </Text>
        <View style={styles.rowSpacer} />
        <Text style={[styles.rowValue, {color: theme.colors.textSecondary}]}>
          {value}
        </Text>
        <Feather
          color={theme.colors.textSecondary}
          name={"chevron-right"}
          size={20}
        />
      </TouchableOpacity>
    </RowWrapper>
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
  const {theme} = useAppTheme();

  return (
    <RowWrapper>
      <TouchableOpacity
        accessibilityRole={"radio"}
        accessibilityState={{selected}}
        onPress={onPress}
        style={styles.row}>
        <Text style={[styles.rowLabel, {color: theme.colors.textPrimary}]}>
          {label}
        </Text>
        <View style={styles.rowSpacer} />
        {selected ? (
          <Feather
            color={theme.colors.textSecondary}
            name={"check"}
            size={20}
          />
        ) : null}
      </TouchableOpacity>
    </RowWrapper>
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
  const {theme} = useAppTheme();

  return (
    <RowWrapper>
      <TouchableOpacity
        accessibilityRole={"radio"}
        accessibilityState={{selected}}
        onPress={onPress}
        style={styles.row}>
        <View style={[styles.rowIcon, {backgroundColor: iconBackground}]}>
          <Feather
            color={theme.colors.textPrimary}
            // @ts-ignore The icon name is supplied by the settings descriptor.
            name={icon}
            size={20}
          />
        </View>
        <Text style={[styles.rowLabel, {color: theme.colors.textPrimary}]}>
          {label}
        </Text>
        <View style={styles.rowSpacer} />
        {selected ? (
          <Feather
            color={theme.colors.textSecondary}
            name={"check"}
            size={20}
          />
        ) : null}
      </TouchableOpacity>
    </RowWrapper>
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
  const {theme} = useAppTheme();

  return (
    <RowWrapper>
      <TouchableOpacity
        accessibilityRole={"button"}
        onPress={onPress}
        style={styles.row}>
        {icon && iconBackground ? (
          <View style={[styles.rowIcon, {backgroundColor: iconBackground}]}>
            <Feather
              color={theme.colors.textPrimary}
              // @ts-ignore The icon name is supplied by the settings descriptor.
              name={icon}
              size={20}
            />
          </View>
        ) : null}
        <Text style={[styles.rowLabel, {color: theme.colors.textPrimary}]}>
          {label}
        </Text>
        <View style={styles.rowSpacer} />
      </TouchableOpacity>
    </RowWrapper>
  );
}

function RowWrapper({children}: {children: React.ReactNode}) {
  const {theme} = useAppTheme();

  return (
    <View style={[styles.rowWrapper, {borderColor: theme.colors.divider}]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    paddingRight: 24,
    minHeight: 50,
  },
  rowWrapper: {
    borderTopWidth: StyleSheet.hairlineWidth,
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
