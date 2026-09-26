import {Feather} from "@expo/vector-icons";
import React from "react";
import {StyleSheet, View} from "react-native";

import {AppListItem} from "@/ui/components";
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
      <AppListItem
        leading={
          <View style={[styles.rowIcon, {backgroundColor: iconBackground}]}>
            <Feather
              color={theme.colors.textPrimary}
              // @ts-ignore The icon name is supplied by the settings descriptor.
              name={icon}
              size={20}
            />
          </View>
        }
        onPress={onPress}
        title={label}
        trailingText={value}
      />
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
      <AppListItem
        onPress={onPress}
        selected={selected}
        title={label}
        trailing={
          selected ? (
            <Feather
              color={theme.colors.textSecondary}
              name={"check"}
              size={20}
            />
          ) : null
        }
      />
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
      <AppListItem
        leading={
          <View style={[styles.rowIcon, {backgroundColor: iconBackground}]}>
            <Feather
              color={theme.colors.textPrimary}
              // @ts-ignore The icon name is supplied by the settings descriptor.
              name={icon}
              size={20}
            />
          </View>
        }
        onPress={onPress}
        selected={selected}
        title={label}
        trailing={
          selected ? (
            <Feather
              color={theme.colors.textSecondary}
              name={"check"}
              size={20}
            />
          ) : null
        }
      />
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
      <AppListItem
        destructive={!icon}
        leading={
          icon && iconBackground ? (
            <View style={[styles.rowIcon, {backgroundColor: iconBackground}]}>
              <Feather
                color={theme.colors.textPrimary}
                // @ts-ignore The icon name is supplied by the settings descriptor.
                name={icon}
                size={20}
              />
            </View>
          ) : undefined
        }
        onPress={onPress}
        title={label}
      />
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
  rowWrapper: {
    marginBottom: 4,
  },
  rowIcon: {
    width: 30,
    height: 30,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
});
