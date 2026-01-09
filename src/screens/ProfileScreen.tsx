import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import i18n from '../i18n';
import { colors } from '../theme/colors';
import { Database } from '../types/database.types';

type UserProfile = Database['public']['Tables']['users']['Row'];

export default function ProfileScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (error) throw error;
      setProfile(data);
      setNewUsername(data?.username || '');
    } catch (error) {
      console.error('Error fetching profile:', error);
      Alert.alert(i18n.t('common.error'), i18n.t('errors.unknown'));
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUsername = async () => {
    if (!newUsername.trim()) {
      Alert.alert(i18n.t('common.error'), i18n.t('errors.fill_all_fields'));
      return;
    }

    try {
      setUpdating(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { error } = await supabase
        .from('users')
        .update({ username: newUsername.trim() })
        .eq('id', session.user.id);

      if (error) throw error;

      setProfile(prev => prev ? { ...prev, username: newUsername.trim() } : null);
      Alert.alert(i18n.t('common.success'), i18n.t('profile.username_updated'));
      setEditModalVisible(false);
    } catch (error) {
      console.error('Error updating username:', error);
      Alert.alert(i18n.t('common.error'), i18n.t('profile.username_update_error'));
    } finally {
      setUpdating(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(i18n.language === 'ja' ? 'ja-JP' : i18n.language === 'ko' ? 'ko-KR' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.accent.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <MaterialIcons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{i18n.t('profile.title')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <Ionicons name="person-circle" size={80} color={colors.text.secondary} />
          </View>
          
          <View style={styles.infoSection}>
            <Text style={styles.label}>{i18n.t('profile.username')}</Text>
            <Text style={styles.value}>{profile?.username || '---'}</Text>
          </View>

          <View style={styles.infoSection}>
            <Text style={styles.label}>{i18n.t('profile.email')}</Text>
            <Text style={styles.value}>{profile?.email}</Text>
          </View>

          <View style={styles.infoSection}>
            <Text style={styles.label}>{i18n.t('profile.member_since')}</Text>
            <Text style={styles.value}>
              {profile ? formatDate(profile.created_at) : '---'}
            </Text>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.editButton}
          onPress={() => {
            setNewUsername(profile?.username || '');
            setEditModalVisible(true);
          }}
        >
          <MaterialIcons name="edit" size={20} color="#fff" />
          <Text style={styles.editButtonText}>{i18n.t('profile.edit_username')}</Text>
        </TouchableOpacity>
      </View>

      {/* Edit Username Modal */}
      <Modal
        visible={editModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setEditModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.modalKeyboardAvoiding}
              >
                <TouchableWithoutFeedback>
                  <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>{i18n.t('profile.edit_username')}</Text>
                    
                    <View style={styles.inputContainer}>
                      <Text style={styles.inputLabel}>{i18n.t('profile.enter_new_username')}</Text>
                      <TextInput
                        style={styles.input}
                        value={newUsername}
                        onChangeText={setNewUsername}
                        placeholder={i18n.t('profile.username')}
                        placeholderTextColor={colors.text.muted}
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                    </View>

                    <View style={styles.modalButtons}>
                      <TouchableOpacity
                        style={[styles.modalButton, styles.cancelButton]}
                        onPress={() => setEditModalVisible(false)}
                        disabled={updating}
                      >
                        <Text style={styles.cancelButtonText}>{i18n.t('common.cancel')}</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity
                        style={[styles.modalButton, styles.saveButton]}
                        onPress={handleUpdateUsername}
                        disabled={updating}
                      >
                        {updating ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Text style={styles.saveButtonText}>{i18n.t('common.save')}</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableWithoutFeedback>
              </KeyboardAvoidingView>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
    letterSpacing: 0.5,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  profileCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderBottomColor: colors.border.default,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  infoSection: {
    marginBottom: 20,
  },
  label: {
    fontSize: 12,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    color: colors.text.primary,
    fontWeight: '500',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent.primary,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalKeyboardAvoiding: {
    width: '100%',
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
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.background.tertiary,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: colors.background.tertiary,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  saveButton: {
    backgroundColor: colors.accent.primary,
  },
  cancelButtonText: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});