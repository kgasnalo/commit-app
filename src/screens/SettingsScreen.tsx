import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  ScrollView,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import i18n, { LANGUAGES } from '../i18n';
import { useLanguage } from '../contexts/LanguageContext';
import { colors } from '../theme/colors';

export default function SettingsScreen({ navigation }: any) {
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const { language: currentLanguage, setLanguage } = useLanguage();

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
              const { error } = await supabase.auth.signOut();
              if (error) throw error;
            } catch (error) {
              console.error('Logout error:', error);
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

              const { data, error } = await supabase.functions.invoke('delete-account');

              if (error) throw error;

              if (data?.success) {
                // Deletion successful, sign out locally
                await supabase.auth.signOut();
              } else {
                throw new Error(data?.error || 'Failed to delete account');
              }
            } catch (error: any) {
              console.error('Delete account error:', error);
              if (error.message === 'UNPAID_DEBT') {
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

  const openURL = (url: string) => {
    Linking.openURL(url).catch((err) => console.error('An error occurred', err));
  };

  const SectionHeader = ({ title }: { title: string }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{title}</Text>
    </View>
  );

  const MenuItem = ({ icon, label, value, onPress, iconColor = colors.text.secondary, textColor = colors.text.primary }: any) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <View style={styles.menuItemLeft}>
        <Ionicons name={icon} size={22} color={iconColor} />
        <Text style={[styles.menuText, { color: textColor }]}>{label}</Text>
      </View>
      <View style={styles.menuItemRight}>
        {value && <Text style={styles.currentValue}>{value}</Text>}
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
        <MenuItem 
          icon="card-outline" 
          label={i18n.t('settings.manage_payment')} 
          onPress={() => openURL('https://commit-app.vercel.app/billing')} // Placeholder URL
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

        <SectionHeader title={i18n.t('settings.legal')} />
        <MenuItem 
          icon="document-text-outline" 
          label={i18n.t('settings.terms')} 
          onPress={() => openURL('https://commit-app.vercel.app/terms')} 
        />
        <MenuItem 
          icon="shield-checkmark-outline" 
          label={i18n.t('settings.privacy')} 
          onPress={() => openURL('https://commit-app.vercel.app/privacy')} 
        />

        <SectionHeader title={i18n.t('settings.support')} />
        <MenuItem 
          icon="mail-outline" 
          label={i18n.t('settings.contact_support')} 
          onPress={() => openURL('mailto:support@commit-app.com')} 
        />

        <View style={styles.bottomSection}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color={colors.status.error} />
            <Text style={styles.logoutText}>{i18n.t('settings.logout')}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteAccount}>
            <Text style={styles.deleteText}>{i18n.t('settings.delete_account')}</Text>
          </TouchableOpacity>

          <Text style={styles.versionText}>Version 1.0.0 (Build 20260109)</Text>
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
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.background.secondary,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text.primary,
    letterSpacing: 0.5,
  },
  content: {
    flex: 1,
  },
  sectionHeader: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 8,
  },
  sectionHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: colors.background.secondary,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  menuText: {
    fontSize: 16,
    fontWeight: '500',
  },
  currentValue: {
    fontSize: 14,
    color: colors.text.secondary,
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
    borderRadius: 12,
    backgroundColor: colors.background.secondary,
    borderWidth: 1,
    borderBottomColor: colors.border.default,
  },
  logoutText: {
    color: colors.status.error,
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    paddingVertical: 8,
  },
  deleteText: {
    color: colors.text.muted,
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  versionText: {
    color: colors.text.muted,
    fontSize: 12,
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.background.secondary,
    borderRadius: 20,
    padding: 24,
    width: '85%',
    maxWidth: 340,
    borderWidth: 1,
    borderBottomColor: colors.border.default,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: 24,
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
    backgroundColor: colors.background.tertiary,
  },
  languageOptionSelected: {
    backgroundColor: colors.background.tertiary,
    borderWidth: 1,
    borderBottomColor: colors.accent.primary,
  },
  languageOptionFlag: {
    fontSize: 24,
  },
  languageOptionText: {
    flex: 1,
    fontSize: 16,
    color: colors.text.secondary,
  },
  languageOptionTextSelected: {
    color: colors.text.primary,
    fontWeight: '700',
  },
});

