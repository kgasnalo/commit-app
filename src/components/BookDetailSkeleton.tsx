import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';

interface SkeletonBoxProps {
  width: number | `${number}%`;
  height: number;
  style?: object;
  borderRadius?: number;
}

function SkeletonBox({ width, height, style, borderRadius = 8 }: SkeletonBoxProps) {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.7, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        { width, height, backgroundColor: '#2A2A2A', borderRadius },
        style,
        animatedStyle,
      ]}
    />
  );
}

export default function BookDetailSkeleton() {
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <SkeletonBox width={24} height={24} borderRadius={4} />
      </View>

      {/* Book cover placeholder */}
      <View style={styles.coverContainer}>
        <SkeletonBox width={150} height={225} borderRadius={8} />
      </View>

      {/* Title placeholder */}
      <View style={styles.titleContainer}>
        <SkeletonBox width="60%" height={24} style={styles.centered} />
      </View>

      {/* Author placeholder */}
      <View style={styles.authorContainer}>
        <SkeletonBox width="40%" height={16} style={styles.centered} />
      </View>

      {/* Tags placeholder */}
      <View style={styles.tagsRow}>
        <SkeletonBox width={60} height={24} borderRadius={12} />
        <SkeletonBox width={80} height={24} borderRadius={12} />
        <SkeletonBox width={70} height={24} borderRadius={12} />
      </View>

      {/* Details card placeholder */}
      <View style={styles.detailsCard}>
        {[1, 2, 3, 4].map((i) => (
          <View key={i} style={styles.detailRow}>
            <SkeletonBox width={80} height={14} />
            <SkeletonBox width={100} height={14} />
          </View>
        ))}
      </View>

      {/* Memo card placeholder */}
      <View style={styles.memoCard}>
        <View style={styles.memoHeader}>
          <SkeletonBox width={100} height={16} />
        </View>
        <SkeletonBox width="100%" height={60} borderRadius={8} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 15,
  },
  coverContainer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  titleContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  authorContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  centered: {
    alignSelf: 'center',
  },
  tagsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  detailsCard: {
    backgroundColor: '#1A1A1A',
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  memoCard: {
    backgroundColor: '#1A1A1A',
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 20,
  },
  memoHeader: {
    marginBottom: 12,
  },
});
