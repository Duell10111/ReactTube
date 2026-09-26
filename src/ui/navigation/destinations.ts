import type {MaterialIcons} from "@expo/vector-icons";
import type {ComponentProps} from "react";

import type {TranslationKey} from "@/localization/en";

export type AppIconName = ComponentProps<typeof MaterialIcons>["name"];

export type PrimaryDestinationKey =
  | "home"
  | "subscriptions"
  | "music"
  | "downloads"
  | "you";

export type PrimaryRouteName =
  | "HomeFeed"
  | "Subscriptions"
  | "MusicHomeFeed"
  | "Download"
  | "You";

export interface PrimaryDestination {
  key: PrimaryDestinationKey;
  route: PrimaryRouteName;
  labelKey: TranslationKey;
  icon: AppIconName;
  /**
   * Destinations that need an account stay visible and explain the sign-in
   * requirement instead of disappearing from the navigation.
   */
  requiresAccount: boolean;
}

const primaryDestinations: readonly PrimaryDestination[] = [
  {
    key: "home",
    route: "HomeFeed",
    labelKey: "navigation.home",
    icon: "home",
    requiresAccount: false,
  },
  {
    key: "subscriptions",
    route: "Subscriptions",
    labelKey: "navigation.subscriptions",
    icon: "subscriptions",
    requiresAccount: true,
  },
  {
    key: "music",
    route: "MusicHomeFeed",
    labelKey: "navigation.music",
    icon: "library-music",
    requiresAccount: false,
  },
  {
    key: "downloads",
    route: "Download",
    labelKey: "navigation.downloads",
    icon: "download",
    requiresAccount: false,
  },
  {
    key: "you",
    route: "You",
    labelKey: "navigation.you",
    icon: "account-circle",
    requiresAccount: false,
  },
];

/**
 * The phone and tablet navigation keeps the same five destinations for signed
 * in and signed out users so the main navigation never changes shape.
 */
export function getPrimaryDestinations(): readonly PrimaryDestination[] {
  return primaryDestinations;
}

export function getPrimaryDestinationByRoute(
  route: string,
): PrimaryDestination | undefined {
  return primaryDestinations.find(destination => destination.route === route);
}

export type TVRailDestinationKey =
  | "home"
  | "search"
  | "subscriptions"
  | "history"
  | "library"
  | "myYoutube"
  | "login"
  | "settings";

export type TVRailPlacement = "top" | "bottom";

export interface TVRailDestination {
  key: TVRailDestinationKey;
  labelKey: TranslationKey;
  icon: AppIconName;
  placement: TVRailPlacement;
  /**
   * `account` destinations are only reachable with an account, `anonymous`
   * destinations replace them while no account is connected.
   */
  availability: "always" | "account" | "anonymous";
}

const tvRailDestinations: readonly TVRailDestination[] = [
  {
    key: "home",
    labelKey: "navigation.home",
    icon: "home",
    placement: "top",
    availability: "always",
  },
  {
    key: "search",
    labelKey: "navigation.search",
    icon: "search",
    placement: "top",
    availability: "always",
  },
  {
    key: "subscriptions",
    labelKey: "navigation.subscriptions",
    icon: "subscriptions",
    placement: "top",
    availability: "account",
  },
  {
    key: "history",
    labelKey: "navigation.history",
    icon: "history",
    placement: "top",
    availability: "account",
  },
  {
    key: "library",
    labelKey: "navigation.library",
    icon: "video-library",
    placement: "top",
    availability: "account",
  },
  {
    key: "myYoutube",
    labelKey: "navigation.myYoutube",
    icon: "account-circle",
    placement: "top",
    availability: "account",
  },
  {
    key: "login",
    labelKey: "navigation.login",
    icon: "login",
    placement: "top",
    availability: "anonymous",
  },
  {
    key: "settings",
    labelKey: "navigation.settings",
    icon: "settings",
    placement: "bottom",
    availability: "always",
  },
];

export function getTVRailDestinations(
  signedIn: boolean,
): readonly TVRailDestination[] {
  return tvRailDestinations.filter(destination =>
    destination.availability === "always"
      ? true
      : destination.availability === "account"
        ? signedIn
        : !signedIn,
  );
}
