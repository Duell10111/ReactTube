import * as Sentry from "@sentry/react-native";

export const navigationIntegration = new Sentry.ReactNavigationInstrumentation({
  enableTimeToInitialDisplay: true,
});
