import {useNavigation, useNavigationState} from "@react-navigation/native";
import React, {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {
  StyleSheet,
  TVFocusGuideView,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import {TVRailItem} from "./TVNavigationRail";

import {useAccountContext} from "@/context/AccountContext";
import DrawerContextProvider from "@/navigation/DrawerContext";
import type {NativeStackProp} from "@/navigation/types";
import {
  getContentPlaneOffset,
  getContentPlaneWidth,
  getTVOverscanInsets,
  getTVRailWidth,
  resolveTVRailState,
  tvRailMetrics,
} from "@/ui/layout";
import {
  findActiveRouteName,
  getTVRailDestinations,
  type TVRailDestinationKey,
} from "@/ui/navigation";
import {useAppTheme} from "@/ui/theme";
import {useTVRemoteEvent} from "@/ui/tv";

/**
 * Focus can leave a rail item shortly before the next one reports focus. The
 * rail waits this long before collapsing so moving inside it does not flicker.
 */
const COLLAPSE_DELAY = 50;

const railRouteNames: Record<TVRailDestinationKey, string> = {
  home: "HomeFeed",
  search: "Search",
  subscriptions: "SubscriptionScreen",
  history: "HistoryScreen",
  library: "LibraryScreen",
  myYoutube: "MyYoutubeScreen",
  login: "LoginScreen",
  settings: "SettingsScreen",
};

interface TVNavigationRailShellProps {
  children: React.ReactNode;
}

/**
 * TV app shell. The rail is the only main navigation: it grows from collapsed
 * to expanded while the content plane keeps its width and is translated by
 * exactly the rail growth, so columns, card sizes, and scroll position stay
 * unchanged.
 */
export function TVNavigationRailShell({children}: TVNavigationRailShellProps) {
  const {width, height} = useWindowDimensions();
  const {theme, reduceMotion} = useAppTheme();
  const navigation = useNavigation<NativeStackProp>();
  const {loginData} = useAccountContext();
  const signedIn = loginData?.accounts?.length > 0;

  const [expanded, setExpanded] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [focusedKey, setFocusedKey] = useState<TVRailDestinationKey>();
  const [lastFocusedKey, setLastFocusedKey] =
    useState<TVRailDestinationKey>("home");
  const [railDestinationRefs, setRailDestinationRefs] = useState<View[]>([]);

  const itemRefs = useRef<Partial<Record<TVRailDestinationKey, View | null>>>(
    {},
  );
  const collapseTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  const destinations = useMemo(
    () => getTVRailDestinations(signedIn),
    [signedIn],
  );
  const railState = resolveTVRailState(hidden, expanded);
  const duration = reduceMotion ? 0 : theme.motion.duration.standard;
  // The rail is chrome at the screen edge: it keeps the vertical margin, where
  // a crop would take a whole destination, and only half the horizontal one —
  // see `tvRailMetrics.leadingInset`. The content beside it keeps the full
  // margin, which the rail's own width already covers.
  const overscan = useMemo(
    () => getTVOverscanInsets({width, height}),
    [height, width],
  );

  const activeRouteName = useNavigationState(findActiveRouteName);
  const selectedKey = useMemo(() => {
    const match = destinations.find(
      destination => railRouteNames[destination.key] === activeRouteName,
    )?.key;

    // The nested stack reports its own route only after it has mounted; until
    // then the shell itself is the active route and shows the start entry.
    return match ?? (activeRouteName === "Home" ? "home" : undefined);
  }, [activeRouteName, destinations]);

  const railWidth = useSharedValue(getTVRailWidth(railState));
  const planeOffset = useSharedValue(getContentPlaneOffset(railState));

  useEffect(() => {
    railWidth.value = withTiming(getTVRailWidth(railState), {duration});
    planeOffset.value = withTiming(getContentPlaneOffset(railState), {
      duration,
    });
  }, [duration, planeOffset, railState, railWidth]);

  useEffect(() => {
    // Restore the remembered destination when focus returns to the rail.
    const target = itemRefs.current[lastFocusedKey];

    setRailDestinationRefs(target ? [target] : []);
  }, [destinations, lastFocusedKey]);

  useEffect(() => () => clearTimeout(collapseTimeout.current), []);

  const cancelCollapse = useCallback(() => {
    clearTimeout(collapseTimeout.current);
  }, []);

  const collapse = useCallback(() => {
    cancelCollapse();
    setExpanded(false);
  }, [cancelCollapse]);

  const scheduleCollapse = useCallback(() => {
    cancelCollapse();
    collapseTimeout.current = setTimeout(
      () => setExpanded(false),
      COLLAPSE_DELAY,
    );
  }, [cancelCollapse]);

  useEffect(() => {
    // A screen that hid the rail must not keep it hidden for the next screen.
    setHidden(false);
  }, [activeRouteName]);

  useTVRemoteEvent(event => {
    if (hidden && event.eventType === "left") {
      // Bring a hidden rail back so focus can never get stuck in the content.
      setHidden(false);
      return;
    }

    // Back closes the rail before it leaves the current screen.
    if (expanded && event.eventType === "menu") {
      collapse();
    }
  });

  const openDestination = useCallback(
    (key: TVRailDestinationKey) => {
      collapse();

      switch (key) {
        case "search":
          navigation.navigate("Search");
          return;
        case "login":
          navigation.navigate("LoginScreen");
          return;
        case "settings":
          navigation.navigate("SettingsScreen");
          return;
        default:
          // @ts-ignore nested drawer stack routes
          navigation.navigate("Home", {screen: railRouteNames[key]});
      }
    },
    [collapse, navigation],
  );

  const railStyle = useAnimatedStyle(() => ({width: railWidth.value}));
  const planeStyle = useAnimatedStyle(() => ({
    transform: [{translateX: planeOffset.value}],
  }));

  const topDestinations = destinations.filter(
    destination => destination.placement === "top",
  );
  const bottomDestinations = destinations.filter(
    destination => destination.placement === "bottom",
  );

  const renderItem = (key: TVRailDestinationKey) => {
    const destination = destinations.find(entry => entry.key === key);

    if (!destination) {
      return null;
    }

    return (
      <TVRailItem
        destination={destination}
        focused={focusedKey === key}
        key={key}
        onBlur={() => {
          setFocusedKey(current => (current === key ? undefined : current));
          scheduleCollapse();
        }}
        onFocus={() => {
          cancelCollapse();
          setFocusedKey(key);
          setLastFocusedKey(key);
          setExpanded(true);
          setHidden(false);
        }}
        onPress={() => openDestination(key)}
        railWidth={railWidth}
        ref={instance => {
          itemRefs.current[key] = instance;
        }}
        selected={selectedKey === key}
      />
    );
  };

  return (
    <DrawerContextProvider onScreenFocused={collapse} setHideDrawer={setHidden}>
      <View style={[styles.root, {backgroundColor: theme.colors.background}]}>
        <Animated.View
          style={[
            styles.plane,
            {
              start: tvRailMetrics.collapsedWidth,
              width: getContentPlaneWidth(width),
            },
            planeStyle,
          ]}>
          {children}
        </Animated.View>
        <Animated.View
          style={[
            styles.rail,
            {backgroundColor: theme.colors.surface},
            railStyle,
          ]}>
          <TVFocusGuideView
            destinations={railDestinationRefs}
            style={[
              styles.railContent,
              {
                paddingStart: tvRailMetrics.leadingInset,
                paddingVertical: overscan.top,
              },
            ]}>
            <View style={styles.railGroup}>
              {topDestinations.map(destination => renderItem(destination.key))}
            </View>
            <View style={styles.railGroup}>
              {bottomDestinations.map(destination =>
                renderItem(destination.key),
              )}
            </View>
          </TVFocusGuideView>
        </Animated.View>
      </View>
    </DrawerContextProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    overflow: "hidden",
  },
  plane: {
    position: "absolute",
    top: 0,
    bottom: 0,
  },
  rail: {
    position: "absolute",
    top: 0,
    bottom: 0,
    start: 0,
    overflow: "hidden",
  },
  railContent: {
    // No fixed width: the rail content follows the animated rail width, so no
    // focusable item ever reaches into the content plane or gets clipped. The
    // padding is the overscan margin and comes from the screen size.
    flex: 1,
    alignSelf: "stretch",
    justifyContent: "space-between",
  },
  railGroup: {
    alignSelf: "stretch",
  },
});
