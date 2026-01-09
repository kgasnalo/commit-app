/**
 * TimerDisplay Component
 * Phase 4.3 - Monk Mode Timer Display
 *
 * Large MM:SS or HH:MM:SS display for active timer.
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';

interface TimerDisplayProps {
  remainingSeconds: number;
  showHours?: boolean;
}

export default function TimerDisplay({
  remainingSeconds,
  showHours = false,
}: TimerDisplayProps) {
  const formattedTime = useMemo(() => {
    const totalSeconds = Math.max(0, Math.floor(remainingSeconds));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const pad = (num: number) => num.toString().padStart(2, '0');

    if (showHours || hours > 0) {
      return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    }
    return `${pad(minutes)}:${pad(seconds)}`;
  }, [remainingSeconds, showHours]);

  return (
    <View style={styles.container}>
      <Text 
        style={styles.time} 
        numberOfLines={1} 
        adjustsFontSizeToFit 
        minimumFontScale={0.5}
      >
        {formattedTime}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 240, // Constrain width to fit inside the timer ring (280px)
  },
  time: {
    fontSize: 64,
    fontWeight: '200',
    color: colors.text.primary,
    letterSpacing: 2,
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
  },
});
