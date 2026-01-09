/**
 * BurningText Component
 * Phase 2.2.2 - Screen 7 Burn Effect
 *
 * Displays text that burns away with a fire/ash effect using Skia shaders.
 * The burn progresses from top to bottom with an orange glow at the burn line.
 */

import React, { useEffect, useMemo, useCallback } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import {
  Canvas,
  Rect,
  RuntimeShader,
  Skia,
  useFont,
  Text as SkiaText,
  Group,
  Mask,
  LinearGradient,
  vec,
  Fill,
  Blur,
} from '@shopify/react-native-skia';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  runOnJS,
  useDerivedValue,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import { ACT_THEMES, TIMING_CONFIGS } from '../../config/animation';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Burn shader source (GLSL)
// Creates a noise-based burn effect with orange glow at the burn edge
const BURN_SHADER_SOURCE = `
uniform float progress;
uniform float height;
uniform vec2 resolution;

// Simple pseudo-random noise
float noise(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

half4 main(vec2 pos) {
  // Normalize position
  float normalizedY = pos.y / height;

  // Add noise to burn edge for organic look
  float noiseVal = noise(pos * 0.05) * 0.15;
  float burnLine = progress + noiseVal;

  // Calculate distance from burn line
  float distFromBurn = normalizedY - burnLine;

  if (distFromBurn > 0.08) {
    // Above burn zone - fully visible (return transparent to show underlying text)
    return half4(0.0, 0.0, 0.0, 0.0);
  } else if (distFromBurn > 0.0) {
    // At burn edge - orange/red glow
    float glowIntensity = 1.0 - (distFromBurn / 0.08);
    return half4(1.0, 0.4 * glowIntensity, 0.0, glowIntensity * 0.9);
  } else if (distFromBurn > -0.05) {
    // Just below burn - red ember
    float emberIntensity = 1.0 + (distFromBurn / 0.05);
    return half4(0.8, 0.1, 0.0, emberIntensity * 0.7);
  } else {
    // Burned area - fully black/transparent
    return half4(0.0, 0.0, 0.0, 1.0);
  }
}
`;

interface BurningTextProps {
  text: string;
  fontSize?: number;
  triggerBurn: boolean;
  delay?: number; // delay in ms before starting burn
  duration?: number; // duration of burn animation
  onBurnComplete?: () => void;
}

export default function BurningText({
  text,
  fontSize = 48,
  triggerBurn,
  delay = 0,
  duration = 2500,
  onBurnComplete,
}: BurningTextProps) {
  const burnProgress = useSharedValue(0);
  const textOpacity = useSharedValue(1);
  const glowOpacity = useSharedValue(0);

  // Container dimensions based on text
  const containerHeight = fontSize * 1.5;
  const containerWidth = SCREEN_WIDTH - 48;

  // Font (use system font)
  const font = useFont(null, fontSize);

  // Handle burn completion callback
  const handleBurnComplete = useCallback(() => {
    onBurnComplete?.();
  }, [onBurnComplete]);

  // Start burn animation when triggered
  useEffect(() => {
    if (triggerBurn) {
      // Show glow first
      glowOpacity.value = withDelay(
        delay,
        withTiming(1, { duration: 300 })
      );

      // Start burn progression
      burnProgress.value = withDelay(
        delay,
        withTiming(
          1.2, // Go slightly past 1 to ensure complete burn
          {
            duration: duration,
            easing: Easing.inOut(Easing.quad),
          },
          (finished) => {
            if (finished && onBurnComplete) {
              runOnJS(handleBurnComplete)();
            }
          }
        )
      );

      // Fade out text as burn progresses
      textOpacity.value = withDelay(
        delay + duration * 0.5,
        withTiming(0, { duration: duration * 0.5 })
      );

      // Fade out glow at end
      glowOpacity.value = withDelay(
        delay + duration * 0.8,
        withTiming(0, { duration: duration * 0.3 })
      );
    }
  }, [triggerBurn, delay, duration]);

  // Derived value for burn progress (for Skia shader)
  const burnProgressDerived = useDerivedValue(() => burnProgress.value);

  // Create the runtime shader
  const shader = useMemo(() => {
    try {
      return Skia.RuntimeEffect.Make(BURN_SHADER_SOURCE);
    } catch (error) {
      console.warn('[BurningText] Shader compilation failed:', error);
      return null;
    }
  }, []);

  // Uniform values for shader
  const uniforms = useDerivedValue(() => ({
    progress: burnProgressDerived.value,
    height: containerHeight,
    resolution: vec(containerWidth, containerHeight),
  }));

  // Animated styles
  const containerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(burnProgress.value, [0, 0.1], [1, 1]),
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  if (!font) {
    // Return placeholder while font loads
    return (
      <View style={[styles.container, { height: containerHeight, width: containerWidth }]} />
    );
  }

  // Calculate text metrics for centering
  const textWidth = font.measureText(text).width;
  const textX = (containerWidth - textWidth) / 2;
  const textY = fontSize; // Baseline position

  return (
    <View style={[styles.container, { height: containerHeight + 20, width: containerWidth }]}>
      {/* Glow layer behind text */}
      <Animated.View style={[styles.glowLayer, glowStyle]}>
        <Canvas style={styles.canvas}>
          <Group>
            <SkiaText
              x={textX}
              y={textY}
              text={text}
              font={font}
              color={ACT_THEMES.act2.orbColors[1]}
            />
            <Blur blur={15} />
          </Group>
        </Canvas>
      </Animated.View>

      {/* Main text with burn effect */}
      <Animated.View style={[styles.textLayer, containerStyle]}>
        <Canvas style={styles.canvas}>
          {/* Base text */}
          <SkiaText
            x={textX}
            y={textY}
            text={text}
            font={font}
            color="#FFFFFF"
          />

          {/* Burn overlay using shader */}
          {shader && (
            <Rect x={0} y={0} width={containerWidth} height={containerHeight}>
              <RuntimeShader source={shader} uniforms={uniforms} />
            </Rect>
          )}
        </Canvas>
      </Animated.View>

      {/* Fire glow at burn line */}
      <Animated.View style={[styles.fireGlow, glowStyle]}>
        <Canvas style={styles.canvas}>
          <Rect x={0} y={0} width={containerWidth} height={containerHeight}>
            <LinearGradient
              start={vec(0, 0)}
              end={vec(0, containerHeight)}
              colors={['transparent', '#FF4500', '#FF0000', 'transparent']}
              positions={[0, 0.4, 0.6, 1]}
            />
          </Rect>
          <Blur blur={20} />
        </Canvas>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  canvas: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  glowLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  textLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  fireGlow: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
    opacity: 0.5,
  },
});
