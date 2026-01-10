import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { titanColors } from '../../theme/titan';
import { MicroLabel } from './MicroLabel';

type StatusType = 'active' | 'dormant' | 'warning';

interface StatusIndicatorProps {
  status: StatusType;
  label?: string;
  showPulse?: boolean;
}

const statusColors: Record<StatusType, string> = {
  active: titanColors.signal.active, // Gold
  dormant: titanColors.text.muted, // Grey
  warning: titanColors.signal.danger, // Ruby
};

const glowColors: Record<StatusType, string> = {
  active: titanColors.signal.activeGlow,
  dormant: 'transparent',
  warning: titanColors.signal.dangerGlow,
};

export function StatusIndicator({
  status,
  label,
  showPulse = true,
}: StatusIndicatorProps) {
  const pulseOpacity = useSharedValue(1);
  const pulseScale = useSharedValue(1);

  useEffect(() => {
    if (showPulse && status !== 'dormant') {
      pulseOpacity.value = withRepeat(
        withTiming(0.4, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
      pulseScale.value = withRepeat(
        withTiming(1.5, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
    } else {
      pulseOpacity.value = 0;
      pulseScale.value = 1;
    }
  }, [status, showPulse]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
    transform: [{ scale: pulseScale.value }],
  }));

  const dotColor = statusColors[status];
  const glowColor = glowColors[status];

  return (
    <View style={styles.container}>
      <View style={styles.dotContainer}>
        {/* Pulse glow layer */}
        <Animated.View
          style={[
            styles.pulseRing,
            { backgroundColor: glowColor },
            pulseStyle,
          ]}
        />
        {/* Solid dot */}
        <View style={[styles.dot, { backgroundColor: dotColor }]} />
      </View>
      {label && (
        <MicroLabel
          style={styles.label}
          active={status === 'active'}
        >
          {label}
        </MicroLabel>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dotContainer: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: {
    marginLeft: 8,
  },
});

export default StatusIndicator;
