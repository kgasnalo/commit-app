import React, { Component, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '../theme';
import i18n from '../i18n';
import { logError } from '../utils/errorLogger';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

interface FallbackProps {
  onRetry: () => void;
}

function ErrorFallbackUI({ onRetry }: FallbackProps) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Ionicons
          name="warning-outline"
          size={64}
          color={colors.status.warning}
        />
        <Text style={styles.title}>{i18n.t('errorBoundary.title')}</Text>
        <Text style={styles.message}>{i18n.t('errorBoundary.message')}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
          <Text style={styles.retryButtonText}>
            {i18n.t('errorBoundary.retry')}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    logError(error, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return <ErrorFallbackUI onRetry={this.handleRetry} />;
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
    paddingHorizontal: spacing.lg,
  },
  title: {
    fontSize: typography.fontSize.headingMedium,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  message: {
    fontSize: typography.fontSize.body,
    color: colors.text.secondary,
    marginTop: spacing.md,
    textAlign: 'center',
    lineHeight: typography.fontSize.body * typography.lineHeight.body,
  },
  retryButton: {
    marginTop: spacing.xl,
    backgroundColor: colors.accent.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  retryButtonText: {
    fontSize: typography.fontSize.button,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
});
