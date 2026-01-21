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
import { TitanBackground } from '../components/titan/TitanBackground';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import i18n from '../i18n';
import { colors, typography } from '../theme';
import { Database } from '../types/database.types';
import { useLanguage } from '../contexts/LanguageContext';
import {
  MonkModeService,
  HeatmapDay,
  StreakStats,
  ReaderTypeResult,
  ReadingInsights,
} from '../lib/MonkModeService';
import { TacticalText } from '../components/titan/TacticalText';
import { MicroLabel } from '../components/titan/MicroLabel';
import { ReadingDNASection } from '../components/reading-dna';
import { captureError } from '../utils/errorLogger';

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

  // Reading DNA state
  const [readerType, setReaderType] = useState<ReaderTypeResult | null>(null);
  const [heatmapData, setHeatmapData] = useState<HeatmapDay[]>([]);
  const [streakStats, setStreakStats] = useState<StreakStats | null>(null);
  const [insights, setInsights] = useState<ReadingInsights | null>(null);
  const [dnaLoading, setDnaLoading] = useState(true);

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

      const readingTime = await MonkModeService.getTotalReadingTime();
      setTotalReadingTime(readingTime);

      const stats = await MonkModeService.getMonthlyStats();
      setMonthlyStats(stats);

      // Fetch Reading DNA data
      setDnaLoading(true);
      try {
        const [heatmap, streaks, type, insightsData] = await Promise.all([
          MonkModeService.getHeatmapData(30),
          MonkModeService.getStreakStats(),
          MonkModeService.detectReaderType(),
          MonkModeService.getReadingInsights(),
        ]);
        setHeatmapData(heatmap);
        setStreakStats(streaks);
        setReaderType(type);
        setInsights(insightsData);
      } catch (dnaError) {
        console.error('Error fetching Reading DNA:', dnaError);
      } finally {
        setDnaLoading(false);
      }
    } catch (error) {
      captureError(error, { location: 'ProfileScreen.fetchProfile' });
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
      setEditModalVisible(false);
    } catch (error) {
      captureError(error, { location: 'ProfileScreen.handleUpdateUsername' });
      console.error('Error updating username:', error);
      Alert.alert(i18n.t('common.error'), i18n.t('profile.username_update_error'));
    } finally {
      setUpdating(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatReadingTime = (totalSeconds: number): string => {
    return MonkModeService.formatDurationString(totalSeconds, language);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={colors.text.muted} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <TitanBackground />

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={{ padding: 4 }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{i18n.t('profile.title')}</Text>
        <TouchableOpacity 
          onPress={() => {
            setNewUsername(profile?.username || '');
            setEditModalVisible(true);
          }}
        >
          <Text style={styles.editLink}>Edit</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
             <Ionicons name="person-circle-outline" size={80} color={colors.text.muted} />
          </View>
          
          <Text style={styles.userName}>{profile?.username || 'Guest'}</Text>
          <Text style={styles.userEmail}>{profile?.email}</Text>
          <Text style={styles.joinedDate}>Member since {profile ? formatDate(profile.created_at) : '-'}</Text>
        </View>

        {totalReadingTime > 0 && (
          <View style={styles.statRow}>
             <View style={styles.statItem}>
                 <Text style={styles.statLabel}>Total Focus</Text>
                 <Text style={styles.statValue}>{formatReadingTime(totalReadingTime)}</Text>
             </View>
          </View>
        )}

        {/* Monthly Stats Chart */}
        <View style={styles.chartContainer}>
          <MicroLabel style={styles.chartTitle}>ACTIVITY TREND</MicroLabel>
          {monthlyStats.data.length > 0 && monthlyStats.data.some(d => d > 0) ? (
            <BarChart
              data={{
                labels: monthlyStats.labels,
                datasets: [{ data: monthlyStats.data }],
              }}
              width={screenWidth - 48}
              height={220}
              yAxisLabel=""
              yAxisSuffix="h"
              chartConfig={{
                backgroundColor: colors.background.primary,
                backgroundGradientFrom: colors.background.primary,
                backgroundGradientTo: colors.background.primary,
                decimalPlaces: 1,
                color: (opacity = 1) => `rgba(197, 160, 89, ${opacity})`, // Gold color
                labelColor: (opacity = 1) => colors.text.muted,
                style: {
                  borderRadius: 0,
                },
                barPercentage: 0.6,
                propsForBackgroundLines: {
                    strokeDasharray: "", // solid lines
                    stroke: colors.border.subtle,
                    strokeWidth: 1
                }
              }}
              style={{
                marginVertical: 8,
                borderRadius: 0,
              }}
              fromZero
              showValuesOnTopOfBars
            />
          ) : (
            <View style={styles.emptyChartContainer}>
              <Text style={styles.emptyChartText}>No activity recorded yet.</Text>
            </View>
          )}
        </View>

        {/* Reading DNA Section */}
        {!dnaLoading && totalReadingTime > 0 && (
          <ReadingDNASection
            readerType={readerType}
            heatmapData={heatmapData}
            streakStats={streakStats}
            insights={insights}
          />
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Edit Username Modal */}
      <Modal
        visible={editModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <TouchableOpacity 
            style={styles.modalOverlay} 
            activeOpacity={1} 
            onPress={() => setEditModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Update Profile</Text>
            </View>
            
            <TextInput
            style={styles.input}
            value={newUsername}
            onChangeText={setNewUsername}
            placeholder="Username"
            placeholderTextColor={colors.text.muted}
            autoCorrect={false}
            />

            <View style={styles.modalButtons}>
                <TouchableOpacity
                style={styles.saveButton}
                onPress={handleUpdateUsername}
                disabled={updating}
                >
                {updating ? (
                    <ActivityIndicator size="small" color="#000" />
                ) : (
                    <Text style={styles.saveButtonText}>Save Changes</Text>
                )}
                </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#080604',
  },
  backgroundContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
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
  },
  headerTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text.primary,
  },
  editLink: {
      color: colors.text.secondary,
      fontSize: 14,
  },
  content: {
    padding: 24,
  },
  scrollView: {
    flex: 1,
  },
  profileSection: {
      alignItems: 'center',
      marginBottom: 40,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  userName: {
      fontSize: 24,
      fontWeight: '300',
      color: colors.text.primary,
      marginBottom: 4,
  },
  userEmail: {
      fontSize: 14,
      color: colors.text.secondary,
      marginBottom: 8,
  },
  joinedDate: {
      fontSize: 12,
      color: colors.text.muted,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 40,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border.subtle,
  },
  statItem: {
      alignItems: 'center',
  },
  statLabel: {
      fontSize: 12,
      color: colors.text.muted,
      marginBottom: 8,
      textTransform: 'uppercase',
      letterSpacing: 1,
  },
  statValue: {
      fontSize: 24,
      fontWeight: '300',
      color: colors.text.primary,
  },
  chartContainer: {
    marginBottom: 24,
    alignItems: 'center',
  },
  chartTitle: {
    marginBottom: 24,
    alignSelf: 'flex-start',
    color: colors.text.muted,
  },
  emptyChartContainer: {
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyChartText: {
      color: colors.text.muted,
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
  modalHeader: {
      alignItems: 'center',
      marginBottom: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
  },
  input: {
    backgroundColor: colors.background.tertiary,
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: colors.text.primary,
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  saveButton: {
    backgroundColor: colors.text.primary,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
    alignItems: 'center',
    width: '100%',
  },
  saveButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
});
