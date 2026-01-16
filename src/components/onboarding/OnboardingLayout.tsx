import React, { useEffect } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing } from '../../theme';
import ProgressBar from './ProgressBar';
import LivingBackground from './LivingBackground';
import ReactiveToastManager from './ReactiveToastManager';
import { useOnboardingAtmosphere } from '../../hooks/useOnboardingAtmosphere';

type Props = {
  currentStep: number;
  totalSteps: number;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  showBackButton?: boolean;
};

export default function OnboardingLayout({
  currentStep,
  totalSteps,
  title,
  subtitle,
  children,
  footer,
  showBackButton = true,
}: Props) {
  const navigation = useNavigation();
  const { updateScreen } = useOnboardingAtmosphere();

  // Update atmosphere context when screen changes
  useEffect(() => {
    updateScreen(currentStep);
  }, [currentStep, updateScreen]);

  return (
    <View style={styles.wrapper}>
      {/* Living Background - absolute positioned behind everything */}
      <LivingBackground />

      <SafeAreaView style={styles.container}>
      {/* 戻るボタン + プログレスバー */}
      <View style={styles.topBar}>
        {showBackButton ? (
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
        ) : (
          <View style={styles.backButtonPlaceholder} />
        )}
        <View style={styles.progressContainer}>
          <ProgressBar currentStep={currentStep} totalSteps={totalSteps} />
        </View>
      </View>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <View style={styles.header}>
          <Text style={styles.title} adjustsFontSizeToFit numberOfLines={title.split('\n').length}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
        <View style={styles.body}>{children}</View>
        {footer && <View style={styles.footer}>{footer}</View>}
      </KeyboardAvoidingView>
    </SafeAreaView>

      {/* Reactive Toast Manager - absolute positioned on top */}
      <ReactiveToastManager />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent', // Transparent to show LivingBackground
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
  backButton: {
    padding: spacing.sm,
    marginRight: spacing.xs,
  },
  backButtonPlaceholder: {
    width: 40,
    marginRight: spacing.xs,
  },
  progressContainer: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  header: {
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
  },
  title: {
    color: colors.text.primary,
    fontSize: typography.fontSize.headingLarge,
    fontWeight: typography.fontWeight.bold,
    lineHeight: typography.fontSize.headingLarge * typography.lineHeight.heading,
    marginBottom: spacing.sm,
  },
  subtitle: {
    color: colors.text.secondary,
    fontSize: typography.fontSize.body,
    lineHeight: typography.fontSize.body * typography.lineHeight.body,
  },
  body: {
    flex: 1,
  },
  footer: {
    paddingBottom: spacing.lg,
  },
});
