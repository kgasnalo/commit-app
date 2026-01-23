import React, { useEffect, useMemo, useRef } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ConfettiEffectProps {
  visible: boolean;
  count?: number;
  colors?: string[];
  origin?: { x: number; y: number };
  duration?: number;
  startDelay?: number;
}

type ParticleShape = 'square' | 'rectangle' | 'circle';

interface ParticleConfig {
  // Initial velocity
  vx: number; // horizontal spread
  vy: number; // upward burst speed
  // Physics
  gravity: number;
  drift: number; // horizontal drift factor
  sineAmplitude: number; // flutter amplitude
  sineFrequency: number; // flutter frequency
  // Appearance
  size: number;
  shape: ParticleShape;
  color: string;
  rotationSpeed: number;
  initialRotation: number;
}

const DEFAULT_COLORS = ['#FF6B35', '#FFB347', '#FFD700', '#FF8C42', '#FFA07A', '#E8A87C'];

function generateParticles(
  count: number,
  colors: string[],
): ParticleConfig[] {
  const particles: ParticleConfig[] = [];

  for (let i = 0; i < count; i++) {
    // Shape distribution: 50% square, 30% rectangle, 20% circle
    const shapeRoll = Math.random();
    let shape: ParticleShape;
    if (shapeRoll < 0.5) shape = 'square';
    else if (shapeRoll < 0.8) shape = 'rectangle';
    else shape = 'circle';

    particles.push({
      vx: (Math.random() - 0.5) * SCREEN_WIDTH * 0.8,
      vy: -(Math.random() * 600 + 400), // upward burst: -400 to -1000
      gravity: 800 + Math.random() * 400, // 800-1200
      drift: (Math.random() - 0.5) * 60,
      sineAmplitude: Math.random() * 30 + 10,
      sineFrequency: Math.random() * 4 + 2,
      size: Math.random() * 8 + 6, // 6-14px
      shape,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotationSpeed: (Math.random() - 0.5) * 720, // degrees per second
      initialRotation: Math.random() * 360,
    });
  }

  return particles;
}

function Particle({
  config,
  progress,
  originX,
  originY,
  duration,
}: {
  config: ParticleConfig;
  progress: SharedValue<number>;
  originX: number;
  originY: number;
  duration: number;
}) {
  const animatedStyle = useAnimatedStyle(() => {
    const t = progress.value * (duration / 1000); // time in seconds

    // Physics
    const x = originX + config.vx * t + config.drift * t + config.sineAmplitude * Math.sin(config.sineFrequency * t);
    const y = originY + config.vy * t + 0.5 * config.gravity * t * t;

    // Rotation
    const rotation = config.initialRotation + config.rotationSpeed * t;

    // Fade: start fading at 70% progress
    const fadeStart = 0.7;
    const opacity = progress.value < fadeStart
      ? 1
      : 1 - ((progress.value - fadeStart) / (1 - fadeStart));

    return {
      transform: [
        { translateX: x },
        { translateY: y },
        { rotate: `${rotation}deg` },
      ],
      opacity: Math.max(0, opacity),
    };
  });

  const particleStyle = useMemo(() => {
    const baseStyle: any = {
      position: 'absolute' as const,
      backgroundColor: config.color,
    };

    switch (config.shape) {
      case 'square':
        baseStyle.width = config.size;
        baseStyle.height = config.size;
        baseStyle.borderRadius = 2;
        break;
      case 'rectangle':
        baseStyle.width = config.size * 0.6;
        baseStyle.height = config.size * 1.4;
        baseStyle.borderRadius = 1.5;
        break;
      case 'circle':
        baseStyle.width = config.size;
        baseStyle.height = config.size;
        baseStyle.borderRadius = config.size / 2;
        break;
    }

    return baseStyle;
  }, [config]);

  return <Animated.View style={[particleStyle, animatedStyle]} />;
}

export default function ConfettiEffect({
  visible,
  count = 60,
  colors = DEFAULT_COLORS,
  origin,
  duration = 3000,
  startDelay = 300,
}: ConfettiEffectProps) {
  const progress = useSharedValue(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const originX = origin?.x ?? SCREEN_WIDTH / 2;
  const originY = origin?.y ?? -10;

  // Generate particle configs when visible changes to true
  const particles = useMemo(() => {
    if (!visible) return [];
    return generateParticles(count, colors);
  }, [visible, count, colors]);

  useEffect(() => {
    if (visible) {
      progress.value = 0;

      timeoutRef.current = setTimeout(() => {
        progress.value = withTiming(1, {
          duration,
          easing: Easing.linear,
        });
      }, startDelay);
    } else {
      progress.value = 0;
    }

    return () => {
      cancelAnimation(progress);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [visible, duration, startDelay]);

  if (!visible || particles.length === 0) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      {particles.map((config, index) => (
        <Particle
          key={index}
          config={config}
          progress={progress}
          originX={originX}
          originY={originY}
          duration={duration}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
    elevation: 10,
  },
});
