/**
 * LegalConsentScreen
 *
 * Displays when Terms/Privacy have been updated and user needs to re-consent.
 * Shows a summary of changes and requires explicit agreement before continuing.
 * Uses in-app bottom sheet to display legal documents.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { colors, typography, spacing } from '../theme';
import { HapticsService } from '../lib/HapticsService';
import { CURRENT_LEGAL_VERSION, LEGAL_VERSION_DATES } from '../config/legalVersions';
import LegalBottomSheet, { LegalDocumentType } from '../components/LegalBottomSheet';
import i18n from '../i18n';
import { captureError } from '../utils/errorLogger';

interface Props {
  userId: string;
  onConsentComplete: () => void;
}

export default function LegalConsentScreen({ userId, onConsentComplete }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [sheetDocumentType, setSheetDocumentType] = useState<LegalDocumentType>('terms');

  const handleOpenTerms = () => {
    HapticsService.feedbackLight();
    setSheetDocumentType('terms');
    setSheetVisible(true);
  };

  const handleOpenPrivacy = () => {
    HapticsService.feedbackLight();
    setSheetDocumentType('privacy');
    setSheetVisible(true);
  };

  const handleCloseSheet = () => {
    setSheetVisible(false);
  };

  const handleCheckbox = () => {
    HapticsService.feedbackSelection();
    setIsChecked(!isChecked);
  };

  const handleAgree = async () => {
    if (!isChecked || isLoading) return;

    HapticsService.feedbackMedium();
    setIsLoading(true);

    try {
      const { error } = await supabase
        .from('users')
        .update({ legal_consent_version: CURRENT_LEGAL_VERSION })
        .eq('id', userId);

      if (error) {
        console.error('Failed to update legal consent:', error);
        HapticsService.feedbackError();
        return;
      }

      HapticsService.feedbackSuccess();
      onConsentComplete();
    } catch (err) {
      captureError(err, { location: 'LegalConsentScreen.handleAgree' });
      console.error('Unexpected error updating legal consent:', err);
      HapticsService.feedbackError();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Titan Background */}
      <View style={styles.backgroundContainer} pointerEvents="none">
        <LinearGradient
          colors={['#1A1008', '#100A06', '#080604']}
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          colors={['rgba(255, 160, 120, 0.15)', 'rgba(255, 160, 120, 0.06)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.8, y: 0.7 }}
          style={StyleSheet.absoluteFill}
        />
      </View>

      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons name="document-text" size={48} color="#FF6B35" />
            </View>
            <Text style={styles.title}>{i18n.t('legal_consent.title')}</Text>
            <Text style={styles.subtitle}>{i18n.t('legal_consent.subtitle')}</Text>
          </View>

          {/* Update Info Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="information-circle" size={24} color="#FF6B35" />
              <Text style={styles.cardTitle}>{i18n.t('legal_consent.update_summary')}</Text>
            </View>
            <Text style={styles.cardText}>
              {i18n.t('legal_consent.update_description')}
            </Text>
            <View style={styles.versionInfo}>
              <Text style={styles.versionLabel}>{i18n.t('legal_consent.version_label')}</Text>
              <Text style={styles.versionValue}>
                {CURRENT_LEGAL_VERSION} ({LEGAL_VERSION_DATES[CURRENT_LEGAL_VERSION]})
              </Text>
            </View>
          </View>

          {/* Document Links */}
          <View style={styles.linksContainer}>
            <TouchableOpacity
              style={styles.linkButton}
              onPress={handleOpenTerms}
              activeOpacity={0.7}
            >
              <View style={styles.linkContent}>
                <Ionicons name="document-outline" size={20} color={colors.text.primary} />
                <Text style={styles.linkText}>{i18n.t('legal_consent.terms_link')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.text.muted} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.linkButton}
              onPress={handleOpenPrivacy}
              activeOpacity={0.7}
            >
              <View style={styles.linkContent}>
                <Ionicons name="shield-outline" size={20} color={colors.text.primary} />
                <Text style={styles.linkText}>{i18n.t('legal_consent.privacy_link')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.text.muted} />
            </TouchableOpacity>
          </View>

          {/* Checkbox */}
          <TouchableOpacity
            style={styles.checkboxContainer}
            onPress={handleCheckbox}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, isChecked && styles.checkboxChecked]}>
              {isChecked && <Ionicons name="checkmark" size={16} color="#080604" />}
            </View>
            <Text style={styles.checkboxLabel}>
              {i18n.t('legal_consent.checkbox_label')}
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.agreeButton, !isChecked && styles.agreeButtonDisabled]}
            onPress={handleAgree}
            disabled={!isChecked || isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color="#080604" />
            ) : (
              <Text style={[styles.agreeButtonText, !isChecked && styles.agreeButtonTextDisabled]}>
                {i18n.t('legal_consent.agree_button')}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Legal Document Bottom Sheet */}
      <LegalBottomSheet
        visible={sheetVisible}
        documentType={sheetDocumentType}
        onClose={handleCloseSheet}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#080604',
  },
  backgroundContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 107, 53, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: typography.fontSize.headingLarge,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: typography.fontSize.body,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: typography.fontSize.body * 1.5,
  },
  card: {
    backgroundColor: 'rgba(26, 23, 20, 0.8)',
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  cardTitle: {
    fontSize: typography.fontSize.headingSmall,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  cardText: {
    fontSize: typography.fontSize.body,
    color: colors.text.secondary,
    lineHeight: typography.fontSize.body * 1.6,
    marginBottom: spacing.md,
  },
  versionInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  versionLabel: {
    fontSize: typography.fontSize.caption,
    color: colors.text.muted,
  },
  versionValue: {
    fontSize: typography.fontSize.caption,
    color: '#FF6B35',
    fontWeight: typography.fontWeight.semibold,
  },
  linksContainer: {
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(26, 23, 20, 0.6)',
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  linkContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  linkText: {
    fontSize: typography.fontSize.body,
    color: colors.text.primary,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
  },
  checkboxLabel: {
    flex: 1,
    fontSize: typography.fontSize.body,
    color: colors.text.secondary,
    lineHeight: typography.fontSize.body * 1.5,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    paddingTop: spacing.md,
  },
  agreeButton: {
    backgroundColor: '#FF6B35',
    borderRadius: 32,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  agreeButtonDisabled: {
    backgroundColor: 'rgba(255, 107, 53, 0.3)',
    shadowOpacity: 0,
  },
  agreeButtonText: {
    fontSize: typography.fontSize.button,
    fontWeight: typography.fontWeight.bold,
    color: '#080604',
  },
  agreeButtonTextDisabled: {
    color: 'rgba(8, 6, 4, 0.5)',
  },
});
