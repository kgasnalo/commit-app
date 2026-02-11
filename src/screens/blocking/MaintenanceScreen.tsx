/**
 * MaintenanceScreen - Blocking UI for system maintenance
 * Phase 8.4 - Remote Config
 *
 * Non-dismissible fullscreen display when maintenance_mode flag is enabled.
 */

import React from 'react';
import { View, Text, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import i18n from '../../i18n';

export default function MaintenanceScreen() {
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
          <Ionicons name="construct-outline" size={80} color="rgba(255, 160, 120, 0.8)" />
        </View>

        {/* Title */}
        <Text style={styles.title}>{i18n.t('blocking.maintenance_title')}</Text>

        {/* Message */}
        <Text style={styles.message}>{i18n.t('blocking.maintenance_message')}</Text>

        {/* Decorative element */}
        <View style={styles.decorativeLine} />
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
    fontWeight: '400',
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
  },
  decorativeLine: {
    width: 60,
    height: 2,
    backgroundColor: 'rgba(255, 160, 120, 0.4)',
    marginTop: 40,
    borderRadius: 1,
  },
});
