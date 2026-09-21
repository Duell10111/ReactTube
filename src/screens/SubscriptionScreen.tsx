import {useNavigation} from "@react-navigation/native";
import React from "react";
import {StyleSheet, View} from "react-native";

import {useAccountContext} from "@/context/AccountContext";
import useSubscriptions from "@/hooks/tv/useSubscriptions";
import {useTranslation} from "@/localization";
import type {RootNavProp} from "@/navigation/RootStackNavigator";
import {EmptyState} from "@/ui/components";
import {MediaFeed} from "@/ui/patterns";

export default function SubscriptionScreen() {
  const {loginData} = useAccountContext();
  const signedIn = loginData.accounts.length > 0;

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
  const {data, fetchMore, refresh, refreshing, loading, error} =
    useSubscriptions();

  return (
    <MediaFeed
      error={error}
      items={data}
      loading={loading}
      onEndReached={fetchMore}
      onRefresh={refresh}
      onRetry={refresh}
      refreshing={refreshing}
      testID={"subscriptions-feed"}
    />
  );
}

const styles = StyleSheet.create({
  stateContainer: {
    flex: 1,
    justifyContent: "center",
  },
});
