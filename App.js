import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import ErrorBoundary from './src/components/ErrorBoundary';
import { OnboardingAtmosphereProvider } from './src/context/OnboardingAtmosphereContext';
import 'react-native-gesture-handler';

export default function App() {
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
