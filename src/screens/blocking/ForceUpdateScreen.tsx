/**
 * ForceUpdateScreen - Blocking UI for required app update
 * Phase 8.4 - Remote Config
 *
 * Non-dismissible fullscreen display when app version is below min_app_version.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { HapticsService } from '../../lib/HapticsService';
import { HAPTIC_BUTTON_SCALES } from '../../config/haptics';
import i18n from '../../i18n';

interface ForceUpdateScreenProps {
  route?: {
    params?: {
      storeUrl?: string;
    };
  };
}

export default function ForceUpdateScreen({ route }: ForceUpdateScreenProps) {
  const storeUrl = route?.params?.storeUrl || '';

  // Button animation
  const buttonScale = useSharedValue(1);

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const handlePressIn = () => {
    buttonScale.value = withSpring(
      HAPTIC_BUTTON_SCALES.heavy.pressed,
      HAPTIC_BUTTON_SCALES.heavy.spring
    );
  };

  const handlePressOut = () => {
    buttonScale.value = withSpring(1, HAPTIC_BUTTON_SCALES.heavy.spring);
  };

  const handleUpdatePress = async () => {
    HapticsService.feedbackHeavy();
    if (storeUrl) {
      try {
        await Linking.openURL(storeUrl);
      } catch (error) {
        // Silently fail - user can manually go to store
      }
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Titan Background */}
      <View style={styles.backgroundContainer} pointerEvents="none">
        <LinearGradient
          colors={['#1A1008', '#100A06', '#080604']}
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          colors={[
            'rgba(255, 160, 120, 0.15)',
            'rgba(255, 160, 120, 0.06)',
            'transparent',
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.8, y: 0.7 }}
          style={StyleSheet.absoluteFill}
        />
      </View>

      <SafeAreaView style={styles.content}>
        {/* Icon */}
        <View style={styles.iconContainer}>
          <Ionicons name="download-outline" size={80} color="rgba(255, 160, 120, 0.8)" />
        </View>

        {/* Title */}
        <Text style={styles.title}>{i18n.t('blocking.update_title')}</Text>

        {/* Message */}
        <Text style={styles.message}>{i18n.t('blocking.update_message')}</Text>

        {/* Update Button */}
        <Animated.View style={[styles.buttonContainer, buttonAnimatedStyle]}>
          <TouchableOpacity
            style={styles.updateButton}
            onPress={handleUpdatePress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            activeOpacity={0.9}
          >
            <Ionicons name="arrow-up-circle" size={24} color="#FAFAFA" />
            <Text style={styles.buttonText}>
              {i18n.t('blocking.update_button')}
            </Text>
          </TouchableOpacity>
        </Animated.View>
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
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  iconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(26, 23, 20, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  title: {
    fontSize: 28,
    fontWeight: '200',
    color: '#FAFAFA',
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: 2,
    textShadowColor: 'rgba(255, 255, 255, 0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  message: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  buttonContainer: {
    width: '100%',
    paddingHorizontal: 20,
  },
  // Piano Black button with orange glow
  updateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#1A1714',
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 32,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FAFAFA',
    letterSpacing: 0.5,
  },
});
