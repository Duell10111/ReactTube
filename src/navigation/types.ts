import {CompositeNavigationProp, RouteProp} from "@react-navigation/native";
import {NativeStackNavigationProp} from "@react-navigation/native-stack";

import {RootDrawerParamList} from "./DrawerStackNavigator";
import {RootStackParamList} from "./RootStackNavigator";

export type NativeStackProp = CompositeNavigationProp<
  NativeStackNavigationProp<RootDrawerParamList>,
  NativeStackNavigationProp<RootStackParamList>
>;

export type RootRouteProp = RouteProp<RootStackParamList>;
