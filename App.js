import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Sentry from '@sentry/react-native';
import AppNavigator from './src/navigation/AppNavigator';
import ErrorBoundary from './src/components/ErrorBoundary';
import { OnboardingAtmosphereProvider } from './src/context/OnboardingAtmosphereContext';
import { SENTRY_DSN } from './src/config/env';
import 'react-native-gesture-handler';

// Initialize Sentry for crash monitoring
if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    // Performance Monitoring: 100% of transactions
    tracesSampleRate: 1.0,
    // Enable debug mode in development
    debug: __DEV__,
    // Disable in development to avoid noise
    enabled: !__DEV__,
    // Attach screenshots to error reports
    attachScreenshot: true,
    // Environment tag
    environment: __DEV__ ? 'development' : 'production',
    // Release tracking
    release: 'commit-app@1.0.0',
  });
}

function App() {
  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <OnboardingAtmosphereProvider>
          <View style={styles.container}>
            <AppNavigator />
            <StatusBar style="auto" />
          </View>
        </OnboardingAtmosphereProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});

// Wrap with Sentry for automatic error boundary and performance monitoring
export default SENTRY_DSN ? Sentry.wrap(App) : App;
