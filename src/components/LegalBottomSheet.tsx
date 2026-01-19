/**
 * LegalBottomSheet
 *
 * A bottom sheet component that displays Terms of Service or Privacy Policy
 * using WebView. Slides up from the bottom with animation.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Modal,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing } from '../theme';
import { HapticsService } from '../lib/HapticsService';
import i18n from '../i18n';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.85;

// Web Portal URLs
const TERMS_URL = 'https://commit-app-web.vercel.app/terms';
const PRIVACY_URL = 'https://commit-app-web.vercel.app/privacy';

export type LegalDocumentType = 'terms' | 'privacy';

interface Props {
  visible: boolean;
  documentType: LegalDocumentType;
  onClose: () => void;
}

export default function LegalBottomSheet({ visible, documentType, onClose }: Props) {
  const [isLoading, setIsLoading] = useState(true);
  const translateY = useSharedValue(SHEET_HEIGHT);
  const backdropOpacity = useSharedValue(0);

  const url = documentType === 'terms' ? TERMS_URL : PRIVACY_URL;
  const title = documentType === 'terms'
    ? i18n.t('legal_sheet.terms_title')
    : i18n.t('legal_sheet.privacy_title');

  useEffect(() => {
    if (visible) {
      setIsLoading(true);
      backdropOpacity.value = withTiming(1, { duration: 200 });
      translateY.value = withSpring(0, {
        damping: 20,
        stiffness: 300,
      });
    } else {
      backdropOpacity.value = withTiming(0, { duration: 200 });
      translateY.value = withTiming(SHEET_HEIGHT, { duration: 250 });
    }
  }, [visible]);

  const handleClose = () => {
    HapticsService.feedbackLight();
    backdropOpacity.value = withTiming(0, { duration: 200 });
    translateY.value = withTiming(SHEET_HEIGHT, { duration: 250 }, () => {
      runOnJS(onClose)();
    });
  };

  const animatedSheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const animatedBackdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  // Inject CSS to style the web content for dark mode
  const injectedCSS = `
    body {
      background-color: #0A0A0A !important;
      color: #FFFFFF !important;
      padding: 16px !important;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif !important;
    }
    a { color: #FF6B35 !important; }
    h1, h2, h3, h4, h5, h6 { color: #FFFFFF !important; }
    p, li, span, div { color: #CCCCCC !important; }
  `;

  const injectedJS = `
    const style = document.createElement('style');
    style.textContent = \`${injectedCSS}\`;
    document.head.appendChild(style);
    true;
  `;

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        {/* Backdrop */}
        <Animated.View style={[styles.backdrop, animatedBackdropStyle]}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={handleClose}
          />
        </Animated.View>

        {/* Sheet */}
        <Animated.View style={[styles.sheet, animatedSheetStyle]}>
          {/* Handle */}
          <View style={styles.handleContainer}>
            <View style={styles.handle} />
          </View>

          {/* Header */}
          <SafeAreaView edges={['top']} style={styles.header}>
            <TouchableOpacity
              onPress={handleClose}
              style={styles.closeButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={24} color={colors.text.primary} />
            </TouchableOpacity>
            <Text style={styles.title}>{title}</Text>
            <View style={styles.closeButtonPlaceholder} />
          </SafeAreaView>

          {/* WebView */}
          <View style={styles.webViewContainer}>
            {isLoading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#FF6B35" />
                <Text style={styles.loadingText}>{i18n.t('legal_sheet.loading')}</Text>
              </View>
            )}
            <WebView
              source={{ uri: url }}
              style={[styles.webView, isLoading && styles.webViewHidden]}
              onLoadEnd={() => setIsLoading(false)}
              injectedJavaScript={injectedJS}
              showsVerticalScrollIndicator={true}
              bounces={true}
              startInLoadingState={false}
              javaScriptEnabled={true}
              domStorageEnabled={true}
            />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  sheet: {
    height: SHEET_HEIGHT,
    backgroundColor: '#0A0A0A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  closeButton: {
    padding: spacing.xs,
  },
  closeButtonPlaceholder: {
    width: 32,
  },
  title: {
    fontSize: typography.fontSize.headingSmall,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  webViewContainer: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  webView: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  webViewHidden: {
    opacity: 0,
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0A0A0A',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: typography.fontSize.body,
    color: colors.text.secondary,
  },
});
