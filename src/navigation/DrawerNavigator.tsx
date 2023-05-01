import React from "react";
import {
  createDrawerNavigator,
  DrawerContentComponentProps,
  DrawerContentScrollView,
} from "@react-navigation/drawer";
import {
  CommonActions,
  DrawerActions,
  useLinkBuilder,
} from "@react-navigation/native";
import {TouchableOpacity} from "react-native";
import HomeScreen from "../screens/HomeScreen";
import {Icon} from "@rneui/base";
import DrawerItem from "./DrawerItem";

const Drawer = createDrawerNavigator<RootDrawerParamList>();

export type RootDrawerParamList = {
  HomeFeed: undefined;
  SearchScreen: undefined;
};

interface Props {
  showSelector?: () => void;
  hideSelector?: () => void;
}

export function DrawerNavigator(props: Props) {
  return (
    <Drawer.Navigator
      screenOptions={{
        headerShown: false,
        swipeEnabled: false,
        drawerType: "slide",
        overlayColor: "red",
      }}
      screenListeners={{
        focus: event => {
          console.log("Focus drawer: ", event);
          props.showSelector?.();
        },
        blur: () => {
          console.log("Blur drawer");
          props.hideSelector?.();
        },
      }}
      drawerContent={DrawerContent}>
      <Drawer.Screen
        name="HomeFeed"
        component={HomeScreen}
        options={{title: "Home", drawerIcon: () => <Icon name={"home"} />}}
      />
    </Drawer.Navigator>
  );
}

export function DrawerContent(props: DrawerContentComponentProps) {
  return (
    <DrawerContentScrollView
      {...props}
      contentContainerStyle={{paddingStart: 0}}>
      <DrawerItem label={"Test"} onPress={() => {}} />
      <DrawerItemList {...props} />
      <DrawerItem
        label={"Settings"}
        icon={() => <Icon name={"settings"} />}
        onPress={() => props.navigation.navigate("SettingsScreen")}
      />
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
      <DrawerItem
        onPress={onPress}
        key={route.key}
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
    );
  }) as React.ReactNode as React.ReactElement;
}
