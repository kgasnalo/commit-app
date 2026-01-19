/**
 * TabErrorBoundary
 *
 * A specialized error boundary for tab navigators.
 * When an error occurs in one tab, only that tab shows the error UI.
 * Other tabs remain functional, allowing users to continue using the app.
 */

import React, { Component, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '../theme';
import i18n from '../i18n';
import { logError } from '../utils/errorLogger';

interface Props {
  children: ReactNode;
  tabName: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class TabErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log with tab context for easier debugging
    logError(error, {
      ...errorInfo,
      componentStack: `[Tab: ${this.props.tabName}]\n${errorInfo.componentStack}`,
    });
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={styles.container}>
          <View style={styles.content}>
            <View style={styles.iconContainer}>
              <Ionicons
                name="alert-circle-outline"
                size={48}
                color={colors.status.warning}
              />
            </View>
            <Text style={styles.title}>{i18n.t('tabError.title')}</Text>
            <Text style={styles.message}>{i18n.t('tabError.message')}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={this.handleRetry}
              activeOpacity={0.8}
            >
              <Ionicons name="refresh" size={18} color="#080604" style={styles.retryIcon} />
              <Text style={styles.retryButtonText}>
                {i18n.t('tabError.retry')}
              </Text>
            </TouchableOpacity>
            <Text style={styles.hint}>{i18n.t('tabError.hint')}</Text>
          </View>
        </SafeAreaView>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 160, 0, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: typography.fontSize.headingSmall,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    textAlign: 'center',
  },
  message: {
    fontSize: typography.fontSize.body,
    color: colors.text.secondary,
    marginTop: spacing.sm,
    textAlign: 'center',
    lineHeight: typography.fontSize.body * typography.lineHeight.body,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xl,
    backgroundColor: '#FF6B35',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  retryIcon: {
    marginRight: spacing.xs,
  },
  retryButtonText: {
    fontSize: typography.fontSize.button,
    fontWeight: typography.fontWeight.bold,
    color: '#080604',
  },
  hint: {
    fontSize: typography.fontSize.caption,
    color: colors.text.muted,
    marginTop: spacing.lg,
    textAlign: 'center',
  },
});
