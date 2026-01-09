import React, { useEffect, useState, useCallback } from 'react';
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
  Dimensions,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { BarChart } from 'react-native-chart-kit';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import i18n from '../i18n';
import { colors } from '../theme/colors';
import { Database } from '../types/database.types';
import { useLanguage } from '../contexts/LanguageContext';
import { MonkModeService } from '../lib/MonkModeService';

type UserProfile = Database['public']['Tables']['users']['Row'];

const screenWidth = Dimensions.get('window').width;

export default function ProfileScreen({ navigation }: any) {
  const { language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [updating, setUpdating] = useState(false);
  const [totalReadingTime, setTotalReadingTime] = useState(0);
  const [monthlyStats, setMonthlyStats] = useState<{ labels: string[]; data: number[] }>({ labels: [], data: [] });

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
    }, [])
  );

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

      // Fetch total reading time from Monk Mode sessions
      const readingTime = await MonkModeService.getTotalReadingTime();
      setTotalReadingTime(readingTime);

      // Fetch monthly stats
      const stats = await MonkModeService.getMonthlyStats();
      setMonthlyStats(stats);
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
    return date.toLocaleDateString(language === 'ja' ? 'ja-JP' : language === 'ko' ? 'ko-KR' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatReadingTime = (totalSeconds: number): string => {
    return MonkModeService.formatDurationString(totalSeconds, language);
  };

  // Debug function to add dummy data
  const addDebugData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const sessions = [];
      const now = new Date();
      
      // Generate 10 random sessions over the last 6 months
      for (let i = 0; i < 10; i++) {
        const date = new Date(now);
        date.setMonth(date.getMonth() - Math.floor(Math.random() * 6));
        date.setDate(Math.floor(Math.random() * 28) + 1);
        
        sessions.push({
          user_id: user.id,
          duration_seconds: Math.floor(Math.random() * 3600) + 1800, // 30-90 minutes
          completed_at: date.toISOString(),
        });
      }

      const { error } = await supabase.from('reading_sessions').insert(sessions);
      if (error) throw error;

      Alert.alert('Debug', 'Test data added successfully. Refreshing...');
      fetchProfile();
    } catch (error) {
      console.error('Debug error:', error);
      Alert.alert('Error', 'Failed to add debug data');
    } finally {
      setLoading(false);
    }
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

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
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

          {totalReadingTime > 0 && (
            <View style={styles.infoSection}>
              <Text style={styles.label}>{i18n.t('profile.total_reading_time')}</Text>
              <Text style={[styles.value, styles.readingTimeValue]}>
                {formatReadingTime(totalReadingTime)}
              </Text>
            </View>
          )}
        </View>

        {/* Monthly Stats Chart */}
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>{i18n.t('profile.monthly_reading_trend') || 'Monthly Trend (Hours)'}</Text>
          {monthlyStats.data.length > 0 && monthlyStats.data.some(d => d > 0) ? (
            <BarChart
              data={{
                labels: monthlyStats.labels,
                datasets: [{ data: monthlyStats.data }],
              }}
              width={screenWidth - 48} // Padding 24 * 2
              height={220}
              yAxisLabel=""
              yAxisSuffix="h"
              chartConfig={{
                backgroundColor: colors.background.secondary,
                backgroundGradientFrom: colors.background.secondary,
                backgroundGradientTo: colors.background.secondary,
                decimalPlaces: 1,
                color: (opacity = 1) => `rgba(255, 77, 0, ${opacity})`, // Accent color
                labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                style: {
                  borderRadius: 16,
                },
                barPercentage: 0.7,
              }}
              style={{
                marginVertical: 8,
                borderRadius: 16,
              }}
              fromZero
              showValuesOnTopOfBars
            />
          ) : (
            <View style={styles.emptyChartContainer}>
              <Ionicons name="bar-chart-outline" size={40} color={colors.text.muted} />
              <Text style={styles.emptyChartText}>{i18n.t('monkmode.no_sessions_yet')}</Text>
            </View>
          )}
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

        {/* Debug Button */}
        <TouchableOpacity 
          style={styles.debugButton}
          onPress={addDebugData}
        >
          <Text style={styles.debugButtonText}>🛠️ [DEBUG] Generate Test Data</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

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
    padding: 24,
  },
  scrollView: {
    flex: 1,
  },
  chartContainer: {
    marginBottom: 24,
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderBottomColor: colors.border.default,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  emptyChartContainer: {
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  emptyChartText: {
    color: colors.text.muted,
    fontSize: 14,
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
  readingTimeValue: {
    color: colors.accent.primary,
    fontWeight: '700',
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
  debugButton: {
    marginTop: 24,
    padding: 12,
    backgroundColor: '#333',
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  debugButtonText: {
    color: '#aaa',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
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
