/**
 * ReactiveToastManager - Toast orchestration layer
 * Phase 2.0.2 - The Reactive Toast System
 *
 * Renders and manages active toasts from the atmosphere context.
 * Uses Reanimated layout animations for smooth enter/exit.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ReactiveToast from './ReactiveToast';
import { useOnboardingAtmosphere } from '../../hooks/useOnboardingAtmosphere';
import { spacing } from '../../theme';

export default function ReactiveToastManager() {
  const { activeToasts, hideToast } = useOnboardingAtmosphere();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          top: insets.top + spacing.xl,
        },
      ]}
      pointerEvents="box-none"
    >
      {activeToasts.map((toast) => (
        <ReactiveToast
          key={toast.id}
          toast={toast}
          onDismiss={() => hideToast(toast.id)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    alignItems: 'center',
    zIndex: 1000,
  },
});
