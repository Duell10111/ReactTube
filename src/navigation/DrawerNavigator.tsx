import React from "react";
import {
  createDrawerNavigator,
  DrawerContentComponentProps,
  DrawerContentScrollView,
  DrawerItem,
} from "@react-navigation/drawer";
import {
  CommonActions,
  DrawerActions,
  useLinkBuilder,
} from "@react-navigation/native";
import {TouchableOpacity} from "react-native";
import SearchScreen from "../screens/SearchScreen";
import HomeScreen from "../screens/HomeScreen";

const Drawer = createDrawerNavigator<RootDrawerParamList>();

export type RootDrawerParamList = {
  HomeFeed: undefined;
  SearchScreen: undefined;
};

export function DrawerNavigator() {
  return (
    <Drawer.Navigator
      screenOptions={{headerShown: false}}
      drawerContent={DrawerContent}>
      <Drawer.Screen
        name="HomeFeed"
        component={HomeScreen}
        options={{title: "Home"}}
      />
      <Drawer.Screen
        name="SearchScreen"
        component={SearchScreen}
        options={{title: "Search"}}
      />
    </Drawer.Navigator>
  );
}

export function DrawerContent(props: DrawerContentComponentProps) {
  return (
    <DrawerContentScrollView {...props}>
      <DrawerItemList {...props} />
    </DrawerContentScrollView>
  );
}

export function DrawerItemList({
  state,
  navigation,
  descriptors,
}: DrawerContentComponentProps) {
  const buildLink = useLinkBuilder();

  const focusedRoute = state.routes[state.index];
  const focusedDescriptor = descriptors[focusedRoute.key];
  const focusedOptions = focusedDescriptor.options;

  const {
    drawerActiveTintColor,
    drawerInactiveTintColor,
    drawerActiveBackgroundColor,
    drawerInactiveBackgroundColor,
  } = focusedOptions;

  return state.routes.map((route, i) => {
    const focused = i === state.index;

    const onPress = () => {
      const event = navigation.emit({
        type: "drawerItemPress",
        target: route.key,
        canPreventDefault: true,
      });

      if (!event.defaultPrevented) {
        navigation.dispatch({
          ...(focused
            ? DrawerActions.closeDrawer()
            : CommonActions.navigate({name: route.name, merge: true})),
          target: state.key,
        });
      }
    };

    const {
      title,
      drawerLabel,
      drawerIcon,
      drawerLabelStyle,
      drawerItemStyle,
      drawerAllowFontScaling,
    } = descriptors[route.key].options;

    return (
      <TouchableOpacity onPress={onPress} key={route.key}>
        <DrawerItem
          label={
            drawerLabel !== undefined
              ? drawerLabel
              : title !== undefined
              ? title
              : route.name
          }
          icon={drawerIcon}
          focused={focused}
          activeTintColor={drawerActiveTintColor}
          inactiveTintColor={drawerInactiveTintColor}
          activeBackgroundColor={drawerActiveBackgroundColor}
          inactiveBackgroundColor={drawerInactiveBackgroundColor}
          allowFontScaling={drawerAllowFontScaling}
          labelStyle={drawerLabelStyle}
          style={drawerItemStyle}
          to={buildLink(route.name, route.params)}
        />
      </TouchableOpacity>
    );
  }) as React.ReactNode as React.ReactElement;
}
