import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Sentry from '@sentry/react-native';
import AppNavigator from './src/navigation/AppNavigator';
import ErrorBoundary from './src/components/ErrorBoundary';
import { SENTRY_DSN } from './src/config/env';
import 'react-native-gesture-handler';

import * as SplashScreen from 'expo-splash-screen';
SplashScreen.preventAutoHideAsync();

// Initialize Sentry for crash monitoring
if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    // Performance Monitoring: 10% of transactions to avoid quota exhaustion
    tracesSampleRate: 0.1,
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
        <View style={styles.container}>
          <AppNavigator />
          <StatusBar style="auto" />
        </View>
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
let WrappedApp = App;
try {
  if (SENTRY_DSN) {
    WrappedApp = Sentry.wrap(App);
  }
} catch (e) {
  console.error('[App] Sentry.wrap failed:', e);
}
export default WrappedApp;
