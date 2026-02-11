import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import i18n from '../i18n';
import { useLanguage } from '../contexts/LanguageContext';
import { colors } from '../theme';
import { Tables } from '../types/database.types';
import { safeOpenURL } from '../utils/linkingUtils';

const LAST_SEEN_DONATION_KEY = 'lastSeenDonationId';
const WEB_PORTAL_URL = 'https://commit-app-web.vercel.app/donations';

const CURRENCY_SYMBOLS: Record<string, string> = {
  JPY: '¥',
  USD: '$',
  EUR: '€',
  GBP: '£',
  KRW: '₩',
};

type Donation = Tables<'donations'>;

interface DonationAnnouncementModalProps {
  visible: boolean;
  onClose: () => void;
  donation: Donation | null;
}

export function DonationAnnouncementModal({
  visible,
  onClose,
  donation,
}: DonationAnnouncementModalProps) {
  const { language } = useLanguage();

  if (!donation) return null;

  const formatCurrency = (amount: number, currency: string) => {
    const symbol = CURRENCY_SYMBOLS[currency] || currency;
    return `${symbol}${amount.toLocaleString()}`;
  };

  const formatQuarter = (year: number, quarter: number) => {
    return i18n.t('donations.quarter_format', { year, quarter });
  };

  const handleViewProof = async () => {
    await safeOpenURL(WEB_PORTAL_URL);
  };

  const handleClose = async () => {
    // Mark this donation as seen
    await AsyncStorage.setItem(LAST_SEEN_DONATION_KEY, donation.id);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Background gradient */}
          <LinearGradient
            colors={['#1A1008', '#100A06', '#080604']}
            style={StyleSheet.absoluteFill}
          />

          {/* Glow effect */}
          <LinearGradient
            colors={['rgba(255, 107, 53, 0.15)', 'transparent']}
            style={[StyleSheet.absoluteFill, { height: '50%' }]}
          />

          {/* Content */}
          <View style={styles.content}>
            {/* Icon */}
            <View style={styles.iconContainer}>
              <Ionicons name="heart" size={32} color="#FF6B35" />
            </View>

            {/* Title */}
            <Text style={styles.title}>{i18n.t('donations.announcement_title')}</Text>
            <Text style={styles.subtitle}>{i18n.t('donations.announcement_subtitle')}</Text>

            {/* Donation Card */}
            <View style={styles.donationCard}>
              <Text style={styles.quarterText}>
                {formatQuarter(donation.year, donation.quarter)}
              </Text>

              <View style={styles.amountRow}>
                <Text style={styles.amountLabel}>{i18n.t('donations.amount_donated')}</Text>
                <Text style={styles.amountValue}>
                  {formatCurrency(donation.amount, donation.currency)}
                </Text>
              </View>

              <View style={styles.destinationRow}>
                <Text style={styles.destinationLabel}>{i18n.t('donations.destination')}</Text>
                <Text style={styles.destinationValue}>{i18n.t('donations.destination_name')}</Text>
              </View>
            </View>

            {/* Buttons */}
            <TouchableOpacity style={styles.primaryButton} onPress={handleViewProof}>
              <Ionicons name="document-text-outline" size={18} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>{i18n.t('donations.view_proof')}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryButton} onPress={handleClose}>
              <Text style={styles.secondaryButtonText}>{i18n.t('donations.close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// Hook to check for unread donations
export function useUnreadDonation() {
  const [unreadDonation, setUnreadDonation] = useState<Donation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUnreadDonation = async () => {
      try {
        // Get the latest donation
        const { data: donations, error } = await supabase
          .from('donations')
          .select('*')
          .order('year', { ascending: false })
          .order('quarter', { ascending: false })
          .limit(1);

        if (error) {
          console.error('Error fetching donations:', error);
          setLoading(false);
          return;
        }

        if (!donations || donations.length === 0) {
          setLoading(false);
          return;
        }

        const latestDonation = donations[0];

        // Check if user has seen this donation
        const lastSeenId = await AsyncStorage.getItem(LAST_SEEN_DONATION_KEY);

        if (lastSeenId !== latestDonation.id) {
          setUnreadDonation(latestDonation);
        }
      } catch (err) {
        console.error('Unexpected error checking donations:', err);
      } finally {
        setLoading(false);
      }
    };

    checkUnreadDonation();
  }, []);

  const markAsRead = async () => {
    if (unreadDonation) {
      await AsyncStorage.setItem(LAST_SEEN_DONATION_KEY, unreadDonation.id);
      setUnreadDonation(null);
    }
  };

  return { unreadDonation, loading, markAsRead };
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  content: {
    padding: 28,
    alignItems: 'center',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 107, 53, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 24,
    textAlign: 'center',
  },
  donationCard: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  quarterText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.5)',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  amountRow: {
    marginBottom: 16,
  },
  amountLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.4)',
    marginBottom: 4,
  },
  amountValue: {
    fontSize: 32,
    fontWeight: '400',
    color: '#FF6B35',
    letterSpacing: -0.5,
  },
  destinationRow: {},
  destinationLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.4)',
    marginBottom: 4,
  },
  destinationValue: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  primaryButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FF6B35',
    paddingVertical: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  secondaryButton: {
    paddingVertical: 12,
  },
  secondaryButtonText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
  },
});
