/**
 * OnboardingScreen0_Welcome
 * Phase 2.1.1 - The Kinetic Intro
 *
 * Welcome screen with animated text sequence and slide-to-begin gesture.
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '../../theme';
import i18n, { LANGUAGES, setLanguage, loadLanguage } from '../../i18n';
import KineticIntro from '../../components/onboarding/KineticIntro';
import SlideToBegin from '../../components/onboarding/SlideToBegin';
import LivingBackground from '../../components/onboarding/LivingBackground';

export default function OnboardingScreen0({ navigation }: any) {
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState('ja');
  const [introComplete, setIntroComplete] = useState(false);

  useEffect(() => {
    // Load saved language on mount
    loadLanguage().then(locale => {
      setCurrentLanguage(locale);
    });
  }, []);

  const handleLanguageChange = async (languageCode: string) => {
    await setLanguage(languageCode);
    setCurrentLanguage(languageCode);
    setLanguageModalVisible(false);
  };

  const getCurrentLanguageFlag = () => {
    const lang = LANGUAGES.find(l => l.code === currentLanguage);
    return lang?.flag || '🇯🇵';
  };

  const handleIntroComplete = () => {
    setIntroComplete(true);
  };

  const handleSlideComplete = () => {
    navigation.navigate('Onboarding1');
  };

  return (
    <View style={styles.wrapper}>
      {/* Living Background */}
      <LivingBackground />

      <SafeAreaView style={styles.container}>
        {/* Language Selector Button */}
        <TouchableOpacity
          style={styles.languageButton}
          onPress={() => setLanguageModalVisible(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.languageFlag}>{getCurrentLanguageFlag()}</Text>
          <Text style={styles.languageButtonText}>{i18n.t('welcome.select_language')}</Text>
          <Ionicons name="chevron-down" size={20} color={colors.text.secondary} />
        </TouchableOpacity>

        <View style={styles.content}>
          {/* Logo */}
          <View style={styles.logoContainer}>
            <View style={styles.iconCircle}>
              <Ionicons name="book" size={48} color="#FFFFFF" />
            </View>
            <Text style={styles.appName}>COMMIT</Text>
          </View>

          {/* Kinetic Intro - Animated Text */}
          <KineticIntro onAnimationComplete={handleIntroComplete} />
        </View>

        {/* Footer with Slide to Begin */}
        <View style={styles.footer}>
          {/* Donation Info */}
          <View style={styles.donationInfo}>
            <Ionicons name="heart" size={20} color={colors.accent.primary} />
            <Text style={styles.donationText}>
              {i18n.t('welcome.donation_info')}
            </Text>
          </View>

          <SlideToBegin
            onComplete={handleSlideComplete}
            disabled={!introComplete}
            label={i18n.t('welcome.slide_to_begin')}
          />

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => navigation.navigate('Auth')}
            activeOpacity={0.7}
          >
            <Text style={styles.secondaryButtonText}>
              {i18n.t('welcome.already_have_account')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Language Selection Modal */}
        <Modal
          visible={languageModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setLanguageModalVisible(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setLanguageModalVisible(false)}
          >
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{i18n.t('welcome.select_language')}</Text>
              {LANGUAGES.map((language) => (
                <TouchableOpacity
                  key={language.code}
                  style={[
                    styles.languageOption,
                    currentLanguage === language.code && styles.languageOptionSelected
                  ]}
                  onPress={() => handleLanguageChange(language.code)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.languageOptionFlag}>{language.flag}</Text>
                  <Text style={[
                    styles.languageOptionText,
                    currentLanguage === language.code && styles.languageOptionTextSelected
                  ]}>
                    {language.name}
                  </Text>
                  {currentLanguage === language.code && (
                    <Ionicons name="checkmark" size={24} color={colors.accent.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  languageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
    marginRight: spacing.md,
    gap: spacing.xs,
  },
  languageFlag: {
    fontSize: 24,
  },
  languageButtonText: {
    fontSize: typography.fontSize.caption,
    color: colors.text.secondary,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  appName: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.text.primary,
    letterSpacing: 4,
  },
  donationInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  donationText: {
    flex: 1,
    fontSize: typography.fontSize.caption,
    color: colors.text.secondary,
    lineHeight: typography.fontSize.caption * 1.6,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  secondaryButton: {
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: colors.text.secondary,
    fontSize: typography.fontSize.caption,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    width: '80%',
    maxWidth: 320,
  },
  modalTitle: {
    fontSize: typography.fontSize.headingMedium,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
    gap: spacing.md,
  },
  languageOptionSelected: {
    backgroundColor: colors.background.secondary,
  },
  languageOptionFlag: {
    fontSize: 28,
  },
  languageOptionText: {
    flex: 1,
    fontSize: typography.fontSize.body,
    color: colors.text.secondary,
  },
  languageOptionTextSelected: {
    color: colors.text.primary,
    fontWeight: typography.fontWeight.semibold,
  },
});
