import {createNavigationContainerRef} from "@react-navigation/native";

import type {RootStackParamList} from "./RootStackNavigator";

/**
 * Navigation from outside of screens, e.g. when Siri asks to open a search.
 * Check `isReady()` first; before the container mounts it cannot navigate.
 */
export const navigationRef = createNavigationContainerRef<RootStackParamList>();
