import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, Bell, Info, Wrench, AlertTriangle, Sparkles } from 'lucide-react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import i18n from '../i18n';
import { useLanguage } from '../contexts/LanguageContext';
import { useUnread } from '../contexts/UnreadContext';

interface Announcement {
  id: string;
  title: string;
  body: string;
  type: 'info' | 'update' | 'maintenance' | 'important';
  published_at: string | null;
  created_at: string;
  expires_at: string | null;
}

export default function AnnouncementsScreen({ navigation }: any) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { language } = useLanguage();
  const { markAsRead } = useUnread();

  // Mark announcements as read when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      markAsRead('announcements');
    }, [markAsRead])
  );

  const fetchAnnouncements = useCallback(async () => {
    try {
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('announcements')
        .select('id, title, body, type, published_at, created_at, expires_at')
        .not('published_at', 'is', null)
        .lte('published_at', new Date().toISOString())
        .order('published_at', { ascending: false });

      if (fetchError) {
        console.error('Error fetching announcements:', fetchError);
        setError(i18n.t('errors.network'));
      } else {
        // Filter out expired announcements client-side
        const now = new Date();
        const filtered = (data || []).filter((a: Announcement) => {
          if (!a.expires_at) return true;
          return new Date(a.expires_at) > now;
        });
        setAnnouncements(filtered);
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      setError(i18n.t('errors.unknown'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const locale = language === 'ja' ? 'ja-JP' : language === 'ko' ? 'ko-KR' : 'en-US';
    return date.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'important':
        return <AlertTriangle size={16} color="#FF4444" />;
      case 'maintenance':
        return <Wrench size={16} color="#FF9800" />;
      case 'update':
        return <Sparkles size={16} color="#4FC3F7" />;
      default:
        return <Info size={16} color="#9E9E9E" />;
    }
  };

  const getTypeBadgeStyle = (type: string) => {
    switch (type) {
      case 'important':
        return { backgroundColor: 'rgba(255, 68, 68, 0.15)', borderColor: 'rgba(255, 68, 68, 0.3)' };
      case 'maintenance':
        return { backgroundColor: 'rgba(255, 152, 0, 0.15)', borderColor: 'rgba(255, 152, 0, 0.3)' };
      case 'update':
        return { backgroundColor: 'rgba(79, 195, 247, 0.15)', borderColor: 'rgba(79, 195, 247, 0.3)' };
      default:
        return { backgroundColor: 'rgba(158, 158, 158, 0.15)', borderColor: 'rgba(158, 158, 158, 0.3)' };
    }
  };

  const renderAnnouncementItem = ({ item, index }: { item: Announcement; index: number }) => {
    const isExpanded = expandedId === item.id;

    return (
      <Animated.View entering={FadeInUp.delay(index * 50)}>
        <TouchableOpacity
          style={styles.announcementCard}
          onPress={() => setExpandedId(isExpanded ? null : item.id)}
          activeOpacity={0.7}
        >
          <View style={styles.cardHeader}>
            <View style={[styles.typeBadge, getTypeBadgeStyle(item.type)]}>
              {getTypeIcon(item.type)}
              <Text style={styles.typeText}>{i18n.t(`announcements.type_${item.type}`)}</Text>
            </View>
            <Text style={styles.dateText}>{item.published_at ? formatDate(item.published_at) : ''}</Text>
          </View>

          <Text style={styles.titleText}>{item.title}</Text>

          <Text style={[styles.bodyText, !isExpanded && styles.bodyTextCollapsed]} numberOfLines={isExpanded ? 0 : 2}>
            {item.body}
          </Text>

          {item.body.length > 100 && (
            <Text style={styles.expandText}>
              {isExpanded ? i18n.t('announcements.collapse') : i18n.t('announcements.expand')}
            </Text>
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Bell size={48} color="rgba(255, 255, 255, 0.2)" />
      <Text style={styles.emptyTitle}>{i18n.t('announcements.empty_title')}</Text>
      <Text style={styles.emptySubtitle}>{i18n.t('announcements.empty_subtitle')}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Background */}
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

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ChevronLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{i18n.t('announcements.title')}</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Content */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FF6B35" />
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <AlertTriangle size={48} color="rgba(255, 68, 68, 0.6)" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
              <Text style={styles.retryButtonText}>{i18n.t('common.ok')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={announcements}
            keyExtractor={(item) => item.id}
            renderItem={renderAnnouncementItem}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={renderEmptyState}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#FF6B35"
                colors={['#FF6B35']}
              />
            }
          />
        )}
      </SafeAreaView>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  headerSpacer: {
    width: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 16,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 107, 53, 0.2)',
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#FF6B35',
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
    flexGrow: 1,
  },
  announcementCard: {
    backgroundColor: 'rgba(26, 23, 20, 0.8)',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 0.5,
  },
  typeText: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  dateText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.4)',
  },
  titleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  bodyText: {
    fontSize: 14,
    lineHeight: 22,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  bodyTextCollapsed: {
    // No additional styling needed for collapsed state
  },
  expandText: {
    fontSize: 12,
    color: '#FF6B35',
    marginTop: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.4)',
    marginTop: 8,
    textAlign: 'center',
  },
});
