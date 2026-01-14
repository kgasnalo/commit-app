import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WifiOff } from 'lucide-react-native';
import { useOfflineStatus } from '../contexts/OfflineContext';
import { colors } from '../theme';
import i18n from '../i18n';

export const OfflineBanner: React.FC = () => {
  const { isOnline } = useOfflineStatus();
  const insets = useSafeAreaInsets();

  if (isOnline) {
    return null;
  }

  return (
    <View style={[styles.container, { top: insets.top }]} pointerEvents="box-none">
      <Animated.View
        entering={FadeInDown.duration(300)}
        exiting={FadeOutUp.duration(300)}
        style={styles.banner}
      >
        <WifiOff size={16} color={colors.text.primary} />
        <Text style={styles.text}>{i18n.t('offline.banner_message')}</Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9999,
    elevation: 9999,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(26, 23, 20, 0.95)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 0.5,
    borderColor: colors.signal.warning,
    shadowColor: colors.signal.warning,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  text: {
    color: colors.text.primary,
    fontSize: 13,
    fontWeight: '500',
  },
});
