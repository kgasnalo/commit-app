import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import {
  NotificationService,
  NotificationPreferences,
} from '../lib/NotificationService';
import { supabase } from '../lib/supabase';
import i18n from '../i18n';
import { colors } from '../theme/colors';

interface PreviewData {
  bookTitle: string;
  dailyTarget: number;
}

export default function NotificationSettingsScreen({ navigation }: any) {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    enabled: true,
    dailyTime: '08:00',
  });
  const [hasPermission, setHasPermission] = useState(true);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);

  useEffect(() => {
    loadSettings();
    loadActiveCommitment();
  }, []);

  const loadSettings = async () => {
    try {
      await NotificationService.initialize();
      const prefs = NotificationService.getPreferences();
      setPreferences(prefs);

      const permission = await NotificationService.hasPermissions();
      setHasPermission(permission);
    } catch (error) {
      console.error('[NotificationSettings] Failed to load settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadActiveCommitment = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch the most urgent active commitment
      const { data: commitments, error } = await supabase
        .from('commitments')
        .select(
          `
          deadline,
          target_pages,
          book:books(title)
        `
        )
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .order('deadline', { ascending: true })
        .limit(1);

      if (error || !commitments?.length) return;

      const commitment = commitments[0];
      const bookData = commitment.book;
      const bookTitle = Array.isArray(bookData)
        ? bookData[0]?.title
        : (bookData as { title: string })?.title;

      if (!bookTitle) return;

      // Calculate daily target
      const now = new Date();
      const deadline = new Date(commitment.deadline);
      const diffMs = deadline.getTime() - now.getTime();
      const remainingDays = Math.max(
        1,
        Math.ceil(diffMs / (1000 * 60 * 60 * 24))
      );
      const dailyTarget = Math.ceil(commitment.target_pages / remainingDays);

      setPreviewData({
        bookTitle,
        dailyTarget,
      });
    } catch (error) {
      console.error('[NotificationSettings] Failed to load commitment:', error);
    }
  };

  const handleToggleEnabled = async (value: boolean) => {
    if (value && !hasPermission) {
      const granted = await NotificationService.requestPermissions();
      if (!granted) {
        Alert.alert(
          i18n.t('notifications.permission_required'),
          i18n.t('notifications.permission_denied'),
          [
            { text: i18n.t('common.cancel'), style: 'cancel' },
            {
              text: i18n.t('notifications.go_to_settings'),
              onPress: () => Linking.openSettings(),
            },
          ]
        );
        return;
      }
      setHasPermission(true);
    }

    await NotificationService.setEnabled(value);
    setPreferences((prev) => ({ ...prev, enabled: value }));
  };

  const handleTimeChange = async (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }

    if (event.type === 'dismissed') {
      setShowTimePicker(false);
      return;
    }

    if (selectedDate) {
      const hours = selectedDate.getHours().toString().padStart(2, '0');
      const minutes = selectedDate.getMinutes().toString().padStart(2, '0');
      const timeString = `${hours}:${minutes}`;

      await NotificationService.setDailyTime(timeString);
      setPreferences((prev) => ({ ...prev, dailyTime: timeString }));

      if (Platform.OS === 'ios') {
        setShowTimePicker(false);
      }
    }
  };

  const parseTimeToDate = (timeString: string): Date => {
    const [hours, minutes] = timeString.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  };

  const formatTimeDisplay = (timeString: string): string => {
    const [hours, minutes] = timeString.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {i18n.t('notifications.settings_title')}
          </Text>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>{i18n.t('common.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with back button */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {i18n.t('notifications.settings_title')}
        </Text>
      </View>

      <View style={styles.content}>
        {/* Enable/Disable Toggle */}
        <View style={styles.settingRow}>
          <View style={styles.settingLabelContainer}>
            <Ionicons
              name="notifications-outline"
              size={22}
              color={colors.text.secondary}
            />
            <Text style={styles.settingLabel}>
              {i18n.t('notifications.enabled')}
            </Text>
          </View>
          <Switch
            value={preferences.enabled}
            onValueChange={handleToggleEnabled}
            trackColor={{
              false: colors.background.tertiary,
              true: colors.accent.primary,
            }}
            thumbColor={colors.text.primary}
          />
        </View>

        {/* Time Picker */}
        {preferences.enabled && (
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => setShowTimePicker(true)}
          >
            <View style={styles.settingLabelContainer}>
              <Ionicons
                name="time-outline"
                size={22}
                color={colors.text.secondary}
              />
              <Text style={styles.settingLabel}>
                {i18n.t('notifications.daily_time')}
              </Text>
            </View>
            <Text style={styles.timeValue}>
              {formatTimeDisplay(preferences.dailyTime)}
            </Text>
          </TouchableOpacity>
        )}

        {showTimePicker && (
          <DateTimePicker
            value={parseTimeToDate(preferences.dailyTime)}
            mode="time"
            is24Hour={false}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleTimeChange}
            themeVariant="dark"
          />
        )}

        {/* Permission warning if denied */}
        {!hasPermission && (
          <TouchableOpacity
            style={styles.warningBox}
            onPress={() => Linking.openSettings()}
          >
            <Ionicons
              name="warning-outline"
              size={20}
              color={colors.status.warning}
            />
            <Text style={styles.warningText}>
              {i18n.t('notifications.permission_denied')}
            </Text>
            <Ionicons
              name="chevron-forward"
              size={16}
              color={colors.status.warning}
            />
          </TouchableOpacity>
        )}

        {/* Notification Preview section */}
        {preferences.enabled && hasPermission && (
          <>
            <Text style={styles.previewHeader}>
              {i18n.t('notifications.preview_title')}
            </Text>
            <View style={styles.infoSection}>
              <Text style={styles.infoText}>
                {i18n.t('notifications.daily_body', {
                  book: previewData?.bookTitle || i18n.t('notifications.preview_fallback_book'),
                  pages: previewData?.dailyTarget || 20,
                })}
              </Text>
            </View>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.background.secondary,
  },
  backButton: {
    marginRight: 16,
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
  },
  content: {
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: colors.text.secondary,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.background.secondary,
  },
  settingLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingLabel: {
    fontSize: 16,
    color: colors.text.primary,
    fontWeight: '500',
  },
  timeValue: {
    fontSize: 16,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
    gap: 12,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: colors.status.warning,
  },
  previewHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginTop: 24,
    marginBottom: 8,
  },
  infoSection: {
    padding: 16,
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  infoText: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
    fontStyle: 'italic',
  },
});
