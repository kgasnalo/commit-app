/**
 * CardRegistrationBanner
 *
 * Displays a persistent banner prompting users to register their payment method.
 * This banner is non-dismissable and appears on the Dashboard until the user
 * has registered a card for penalty payments.
 *
 * Part of Phase 7.8 - Payment Method Registration Flow
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { CreditCard, ChevronRight } from 'lucide-react-native';
import { colors } from '../theme';
import i18n from '../i18n';

interface CardRegistrationBannerProps {
  onPress?: () => void;
}

const WEB_PORTAL_URL = 'https://commit-app-web.vercel.app';

export const CardRegistrationBanner: React.FC<CardRegistrationBannerProps> = ({ onPress }) => {
  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      // Default: Open Web Portal billing page
      Linking.openURL(`${WEB_PORTAL_URL}/billing`);
    }
  };

  return (
    <Animated.View
      entering={FadeInDown.duration(400).delay(200)}
      style={styles.container}
    >
      <TouchableOpacity
        style={styles.banner}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        {/* Icon */}
        <View style={styles.iconContainer}>
          <CreditCard size={22} color="#FF6B35" />
        </View>

        {/* Text Content */}
        <View style={styles.textContainer}>
          <Text style={styles.title}>
            {i18n.t('card_registration.banner_title')}
          </Text>
          <Text style={styles.description}>
            {i18n.t('card_registration.banner_description')}
          </Text>
        </View>

        {/* Arrow */}
        <View style={styles.arrowContainer}>
          <ChevronRight size={20} color="rgba(255, 255, 255, 0.5)" />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(26, 23, 20, 0.8)',
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 107, 53, 0.3)',
    padding: 16,
    // Subtle glow effect
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 107, 53, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    color: colors.text.primary,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  description: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 18,
  },
  arrowContainer: {
    marginLeft: 8,
  },
});

export default CardRegistrationBanner;
