import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import i18n, { LANGUAGES, setLanguage, loadLanguage } from '../i18n';

export default function SettingsScreen({ navigation }: any) {
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

  const getCurrentLanguageName = () => {
    const lang = LANGUAGES.find(l => l.code === currentLanguage);
    return lang?.name || '日本語';
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{i18n.t('settings.title')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        {/* Language Setting */}
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => setLanguageModalVisible(true)}
        >
          <Ionicons name="language" size={24} color="#666" />
          <Text style={styles.menuText}>{i18n.t('settings.language')}</Text>
          <Text style={styles.currentValue}>{getCurrentLanguageName()}</Text>
          <MaterialIcons name="chevron-right" size={24} color="#ccc" />
        </TouchableOpacity>

        {/* Logout */}
        <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color="#ff6b6b" />
          <Text style={[styles.menuText, { color: '#ff6b6b' }]}>{i18n.t('settings.logout')}</Text>
          <MaterialIcons name="chevron-right" size={24} color="#ccc" />
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
                  <Ionicons name="checkmark" size={24} color="#FF4D00" />
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
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    padding: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  menuText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
  },
  currentValue: {
    fontSize: 14,
    color: '#999',
    marginRight: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: '80%',
    maxWidth: 320,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    textAlign: 'center',
    marginBottom: 20,
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4,
    gap: 12,
  },
  languageOptionSelected: {
    backgroundColor: '#f5f5f5',
  },
  languageOptionFlag: {
    fontSize: 28,
  },
  languageOptionText: {
    flex: 1,
    fontSize: 16,
    color: '#666',
  },
  languageOptionTextSelected: {
    color: '#000',
    fontWeight: '600',
  },
});
