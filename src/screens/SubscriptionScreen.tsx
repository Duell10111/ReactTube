import {useNavigation} from "@react-navigation/native";
import React from "react";
import {StyleSheet, View} from "react-native";

import GridFeedView from "@/components/grid/GridFeedView";
import {useAccountContext} from "@/context/AccountContext";
import ShelfVideoSelectorProvider from "@/context/ShelfVideoSelector";
import useSubscriptions from "@/hooks/tv/useSubscriptions";
import {useTranslation} from "@/localization";
import type {RootNavProp} from "@/navigation/RootStackNavigator";
import {EmptyState} from "@/ui/components";

export default function SubscriptionScreen() {
  const {loginData} = useAccountContext();
  const signedIn = loginData.accounts.length > 0;

  // TODO: Adapt for Phones in future again?

  if (!signedIn) {
    return <SubscriptionSignInState />;
  }

  return <SubscriptionFeed />;
}

function SubscriptionSignInState() {
  const {t} = useTranslation();
  const navigation = useNavigation<RootNavProp>();

  return (
    <View style={styles.stateContainer}>
      <EmptyState
        actionLabel={t("navigation.login")}
        message={t("subscriptions.signedOut.message")}
        onAction={() => navigation.navigate("LoginScreen")}
        title={t("subscriptions.signedOut.title")}
      />
    </View>
  );
}

function SubscriptionFeed() {
  const {data, fetchMore} = useSubscriptions();

  return (
    <View>
      <ShelfVideoSelectorProvider>
        <GridFeedView items={data} onEndReached={fetchMore} />
      </ShelfVideoSelectorProvider>
    </View>
  );
}

const styles = StyleSheet.create({
  stateContainer: {
    flex: 1,
    justifyContent: "center",
  },
});
