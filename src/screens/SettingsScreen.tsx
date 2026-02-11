import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  ScrollView,
  Switch,
  Platform,
  Linking,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { invokeFunctionWithRetry } from '../lib/supabaseHelpers';
import i18n, { LANGUAGES } from '../i18n';
import { useLanguage } from '../contexts/LanguageContext';
import { colors, typography } from '../theme';
import { MicroLabel } from '../components/titan/MicroLabel';
import * as AnalyticsService from '../lib/AnalyticsService';
import { safeOpenURL } from '../utils/linkingUtils';
import { captureError } from '../utils/errorLogger';
import LegalBottomSheet, { LegalDocumentType } from '../components/LegalBottomSheet';
import type { JobCategory } from '../types';
import { restorePurchases, isIAPAvailable } from '../lib/IAPService';

const JOB_CATEGORY_LABELS: Record<JobCategory, string> = {
  engineer: 'onboarding.job_categories.engineer',
  designer: 'onboarding.job_categories.designer',
  pm: 'onboarding.job_categories.pm',
  marketing: 'onboarding.job_categories.marketing',
  sales: 'onboarding.job_categories.sales',
  hr: 'onboarding.job_categories.hr',
  cs: 'onboarding.job_categories.cs',
  founder: 'onboarding.job_categories.founder',
  other: 'onboarding.job_categories.other',
};

export default function SettingsScreen({ navigation }: any) {
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const [legalSheetVisible, setLegalSheetVisible] = useState(false);
  const [legalDocumentType, setLegalDocumentType] = useState<LegalDocumentType>('terms');
  const [showInRanking, setShowInRanking] = useState(true);
  const [isLoadingRanking, setIsLoadingRanking] = useState(true);
  const [jobCategory, setJobCategory] = useState<JobCategory | null>(null);
  const { language: currentLanguage, setLanguage } = useLanguage();

  useEffect(() => {
    const fetchUserSettings = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const { data, error } = await supabase
          .from('users')
          .select('show_in_ranking, job_category')
          .eq('id', session.user.id)
          .single();

        if (!error && data) {
          setShowInRanking(data.show_in_ranking ?? true);
          setJobCategory(data.job_category as JobCategory | null);
        }
      } catch (error) {
        captureError(error, { location: 'SettingsScreen.fetchUserSettings' });
      } finally {
        setIsLoadingRanking(false);
      }
    };

    fetchUserSettings();
  }, []);

  // Refetch when returning from JobCategorySettings
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const { data } = await supabase
          .from('users')
          .select('job_category')
          .eq('id', session.user.id)
          .single();

        if (data) {
          setJobCategory(data.job_category as JobCategory | null);
        }
      } catch (error) {
        // Silently fail
      }
    });

    return unsubscribe;
  }, [navigation]);

  const handleRankingToggle = async (value: boolean) => {
    setShowInRanking(value);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { error } = await supabase
        .from('users')
        .update({ show_in_ranking: value })
        .eq('id', session.user.id);

      if (error) {
        // Revert on error
        setShowInRanking(!value);
        throw error;
      }
    } catch (error) {
      captureError(error, { location: 'SettingsScreen.handleRankingToggle' });
      Alert.alert(i18n.t('common.error'), i18n.t('errors.unknown'));
    }
  };

  const handleOpenLegalSheet = (type: LegalDocumentType) => {
    setLegalDocumentType(type);
    setLegalSheetVisible(true);
  };

  const handleLanguageChange = async (languageCode: string) => {
    await setLanguage(languageCode);
    setLanguageModalVisible(false);
  };

  const getCurrentLanguageName = () => {
    const lang = LANGUAGES.find(l => l.code === currentLanguage);
    return lang?.name || i18n.t('settings.default_language');
  };

  const handleLogout = async () => {
    Alert.alert(
      i18n.t('settings.logout_confirm_title'),
      i18n.t('settings.logout_confirm_message'),
      [
        { text: i18n.t('common.cancel'), style: 'cancel' },
        {
          text: i18n.t('settings.logout'),
          style: 'destructive',
          onPress: async () => {
            try {
              // Phase 8.3: Track logout
              AnalyticsService.userLoggedOut();
              const { error } = await supabase.auth.signOut();
              if (error) throw error;
            } catch (error) {
              // SECURITY: Only log error details in dev, send to Sentry in production
              if (__DEV__) console.error('Logout error:', error);
              captureError(error, { location: 'SettingsScreen.handleLogout' });
              Alert.alert(i18n.t('common.error'), i18n.t('settings.logout_error'));
            }
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      i18n.t('settings.delete_account'),
      i18n.t('settings.delete_account_confirm_message'),
      [
        { text: i18n.t('common.cancel'), style: 'cancel' },
        {
          text: i18n.t('settings.delete_account'),
          style: 'destructive',
          onPress: async () => {
            try {
              const { data: { session } } = await supabase.auth.getSession();
              if (!session) return;

              // WORKER_ERROR 対策としてリトライロジックを使用
              const { data, error } = await invokeFunctionWithRetry<{
                success: boolean;
                error?: string;
              }>('delete-account', {});

              if (error) throw error;

              if (data?.success) {
                // Phase 8.3: Track account deletion
                AnalyticsService.accountDeleted();
                await supabase.auth.signOut();
              } else {
                throw new Error(data?.error || 'Failed to delete account');
              }
            } catch (error) {
              captureError(error, { location: 'SettingsScreen.handleDeleteAccount' });
              const errorMessage = error instanceof Error ? error.message : 'Unknown error';
              if (errorMessage === 'UNPAID_DEBT') {
                Alert.alert(
                  i18n.t('common.error'),
                  i18n.t('settings.delete_account_error_failed_payments')
                );
              } else {
                Alert.alert(i18n.t('common.error'), i18n.t('errors.unknown'));
              }
            }
          },
        },
      ]
    );
  };

  const openURL = async (url: string) => {
    try {
      if (url.startsWith('mailto:')) {
        // Email links open in external mail app with validation
        await safeOpenURL(url);
      } else {
        // Web URLs open in-app browser (SFSafariViewController on iOS)
        await WebBrowser.openBrowserAsync(url);
      }
    } catch (err) {
      captureError(err, { location: 'SettingsScreen.openURL', extra: { url } });
    }
  };

  // Open billing page with OTT for seamless authentication
  const openBillingPage = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // Not logged in - open login page
        await WebBrowser.openBrowserAsync('https://commit-app-web.vercel.app/login');
        return;
      }

      // Generate OTT token
      const { data, error } = await invokeFunctionWithRetry<{
        success: boolean;
        token?: string;
        error?: string;
      }>('generate-auth-token', {});

      if (error || !data?.token) {
        // Fallback to normal URL if OTT generation fails
        captureError(error || new Error('No token received'), {
          location: 'SettingsScreen.openBillingPage',
        });
        await WebBrowser.openBrowserAsync('https://commit-app-web.vercel.app/billing');
        return;
      }

      // Open with OTT for seamless SSO
      await WebBrowser.openBrowserAsync(
        `https://commit-app-web.vercel.app/auth/auto?token=${data.token}&redirect=/billing`
      );
    } catch (err) {
      captureError(err, { location: 'SettingsScreen.openBillingPage' });
      // Fallback to normal URL
      await WebBrowser.openBrowserAsync('https://commit-app-web.vercel.app/billing');
    }
  };

  // 購入復元ハンドラ（iOS のみ）
  const handleRestorePurchases = async () => {
    if (!isIAPAvailable()) return;

    try {
      const result = await restorePurchases();

      if (result.success) {
        Alert.alert(
          i18n.t('common.success'),
          i18n.t('errors.iap_restore_success')
        );
      } else {
        if (result.error === 'NO_PURCHASES_FOUND') {
          Alert.alert(
            i18n.t('common.error'),
            i18n.t('errors.iap_restore_no_purchases')
          );
        } else {
          Alert.alert(
            i18n.t('common.error'),
            i18n.t('errors.iap_restore_failed')
          );
        }
      }
    } catch (error) {
      captureError(error, { location: 'SettingsScreen.handleRestorePurchases' });
      Alert.alert(i18n.t('common.error'), i18n.t('errors.iap_restore_failed'));
    }
  };

  // サブスクリプション管理（App Store設定を開く）
  const handleManageSubscription = () => {
    if (Platform.OS === 'ios') {
      // iOS: App Store のサブスクリプション管理画面を開く
      Linking.openURL('https://apps.apple.com/account/subscriptions');
    }
  };

  const SectionHeader = ({ title }: { title: string }) => (
    <View style={styles.sectionHeader}>
      <MicroLabel color={colors.text.muted}>{title}</MicroLabel>
    </View>
  );

  const MenuItem = ({ icon, label, value, onPress, iconColor = colors.text.secondary, textColor = colors.text.primary }: any) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <View style={styles.menuItemLeft}>
        <Ionicons name={icon} size={20} color={iconColor} />
        <Text style={[styles.menuText, { color: textColor }]}>{label}</Text>
      </View>
      <View style={styles.menuItemRight}>
        {value && <Text style={styles.valueText}>{value}</Text>}
        <MaterialIcons name="chevron-right" size={20} color={colors.text.muted} />
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{i18n.t('settings.title')}</Text>
      </View>

      <ScrollView style={styles.content}>
        <SectionHeader title={i18n.t('settings.account')} />
        <MenuItem
          icon="person-outline"
          label={i18n.t('profile.title')}
          onPress={() => navigation.navigate('Profile')}
        />
        {Platform.OS === 'ios' && isIAPAvailable() && (
          <>
            <MenuItem
              icon="refresh-outline"
              label={i18n.t('settings.restore_purchases')}
              onPress={handleRestorePurchases}
            />
            <MenuItem
              icon="settings-outline"
              label={i18n.t('settings.manage_subscription')}
              onPress={handleManageSubscription}
            />
          </>
        )}
        {/* Payment management removed for App Review compliance (Guideline 3.2.2) */}
        <MenuItem
          icon="briefcase-outline"
          label={i18n.t('settings.job_category')}
          value={jobCategory ? i18n.t(JOB_CATEGORY_LABELS[jobCategory]) : '-'}
          onPress={() => navigation.navigate('JobCategorySettings')}
        />
        <MenuItem
          icon="bar-chart-outline"
          label={i18n.t('settings.view_job_rankings')}
          onPress={() => navigation.navigate('JobRanking', {})}
        />

        <SectionHeader title={i18n.t('settings.language')} />
        <MenuItem
          icon="language-outline"
          label={i18n.t('settings.language')}
          value={getCurrentLanguageName()}
          onPress={() => setLanguageModalVisible(true)}
        />

        <SectionHeader title={i18n.t('settings.notifications')} />
        <MenuItem
          icon="notifications-outline"
          label={i18n.t('notifications.settings_title')}
          onPress={() => navigation.navigate('NotificationSettings')}
        />

        <SectionHeader title={i18n.t('settings.ranking_section')} />
        <View style={styles.toggleItem}>
          <View style={styles.toggleItemLeft}>
            <Ionicons name="trophy-outline" size={20} color={colors.text.secondary} />
            <View style={styles.toggleTextContainer}>
              <Text style={styles.menuText}>{i18n.t('settings.show_in_ranking')}</Text>
              <Text style={styles.toggleDescription}>
                {i18n.t('settings.show_in_ranking_description')}
              </Text>
            </View>
          </View>
          <Switch
            value={showInRanking}
            onValueChange={handleRankingToggle}
            disabled={isLoadingRanking}
            trackColor={{ false: colors.border.default, true: colors.accent.primary }}
            thumbColor={colors.text.primary}
          />
        </View>

        <SectionHeader title={i18n.t('settings.legal')} />
        <MenuItem
          icon="document-text-outline"
          label={i18n.t('settings.terms')}
          onPress={() => handleOpenLegalSheet('terms')}
        />
        <MenuItem
          icon="shield-checkmark-outline"
          label={i18n.t('settings.privacy')}
          onPress={() => handleOpenLegalSheet('privacy')}
        />

        <SectionHeader title={i18n.t('settings.support')} />
        <MenuItem
          icon="megaphone-outline"
          label={i18n.t('announcements.menu_item')}
          onPress={() => navigation.navigate('Announcements')}
        />
        {/* Donation links removed for App Review compliance (Guideline 3.2.2) */}
        <MenuItem
          icon="mail-outline"
          label={i18n.t('settings.contact_support')}
          onPress={() => openURL('https://commit-app-web.vercel.app/support')}
        />

        <View style={styles.bottomSection}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color={colors.signal.danger} />
            <Text style={styles.logoutText}>{i18n.t('settings.logout')}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteAccount}>
            <Text style={styles.deleteText}>
              {i18n.t('settings.delete_account')}
            </Text>
          </TouchableOpacity>

          <Text style={styles.versionText}>
            Version 1.0.0
          </Text>
        </View>
      </ScrollView>

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
            <Text style={styles.modalTitle}>{i18n.t('settings.select_language')}</Text>
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
                  <Ionicons name="checkmark" size={20} color={colors.text.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Legal Document Bottom Sheet */}
      <LegalBottomSheet
        visible={legalSheetVisible}
        documentType={legalDocumentType}
        onClose={() => setLegalSheetVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  content: {
    flex: 1,
  },
  sectionHeader: {
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 8,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  menuText: {
    fontSize: 16,
    fontWeight: '400',
    color: colors.text.primary,
  },
  toggleItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  toggleItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  toggleTextContainer: {
    flex: 1,
  },
  toggleDescription: {
    fontSize: 12,
    color: colors.text.muted,
    marginTop: 4,
  },
  valueText: {
      color: colors.text.secondary,
      fontSize: 14,
  },
  bottomSection: {
    padding: 24,
    alignItems: 'center',
    gap: 16,
    marginTop: 20,
    marginBottom: 40,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: 'rgba(128, 0, 0, 0.1)', 
  },
  logoutText: {
    color: colors.signal.danger,
    fontSize: 16,
    fontWeight: '500',
  },
  deleteButton: {
    paddingVertical: 8,
  },
  deleteText: {
      color: colors.text.muted,
      textDecorationLine: 'underline',
  },
  versionText: {
      color: colors.text.muted,
      fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.background.card,
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxWidth: 340,
  },
  modalTitle: {
    textAlign: 'center',
    marginBottom: 24,
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    gap: 12,
    backgroundColor: colors.background.tertiary,
  },
  languageOptionSelected: {
    backgroundColor: colors.border.bright,
  },
  languageOptionFlag: {
    fontSize: 20,
  },
  languageOptionText: {
    flex: 1,
    fontSize: 16,
    color: colors.text.secondary,
  },
  languageOptionTextSelected: {
    color: colors.text.primary,
    fontWeight: '600',
  },
});
