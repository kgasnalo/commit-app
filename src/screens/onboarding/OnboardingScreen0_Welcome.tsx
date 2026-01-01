import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '../../theme';
import i18n, { LANGUAGES, setLanguage, loadLanguage } from '../../i18n';

export default function OnboardingScreen0({ navigation }: any) {
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState('ja');

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

  return (
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
        {/* ロゴ/アイコン */}
        <View style={styles.logoContainer}>
          <View style={styles.iconCircle}>
            <Ionicons name="book" size={48} color={colors.accent.primary} />
          </View>
          <Text style={styles.appName}>COMMIT</Text>
        </View>

        {/* メインコピー */}
        <View style={styles.copyContainer}>
          <Text style={styles.headline}>
            {i18n.t('welcome.title')}
          </Text>
          <Text style={styles.subheadline}>
            {i18n.t('welcome.subtitle')}
          </Text>
        </View>

        {/* 寄付先の説明 */}
        <View style={styles.donationInfo}>
          <Ionicons name="heart" size={20} color={colors.accent.primary} />
          <Text style={styles.donationText}>
            {i18n.t('welcome.donation_info')}
          </Text>
        </View>
      </View>

      {/* CTA */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.navigate('Onboarding1')}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryButtonText}>{i18n.t('welcome.start')}</Text>
        </TouchableOpacity>

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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
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
    marginBottom: spacing.xxl,
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
  copyContainer: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  headline: {
    fontSize: typography.fontSize.headingLarge,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    textAlign: 'center',
    lineHeight: typography.fontSize.headingLarge * 1.3,
    marginBottom: spacing.md,
  },
  subheadline: {
    fontSize: typography.fontSize.body,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: typography.fontSize.body * 1.6,
  },
  donationInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
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
  primaryButton: {
    backgroundColor: colors.accent.primary,
    height: 56,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: colors.text.primary,
    fontSize: typography.fontSize.button,
    fontWeight: typography.fontWeight.semibold,
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
