import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, ScanBarcode, BookX, RefreshCw, Search } from 'lucide-react-native';
import { TouchableOpacity as GHTouchableOpacity } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import i18n from '../i18n';
import { supabase } from '../lib/supabase';
import { isValidISBN, normalizeISBN } from '../utils/isbn';
import * as AnalyticsService from '../lib/AnalyticsService';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SCAN_AREA_SIZE = SCREEN_WIDTH * 0.7;

interface GoogleBook {
  id: string;
  volumeInfo: {
    title: string;
    authors?: string[];
    imageLinks?: {
      thumbnail?: string;
      smallThumbnail?: string;
    };
  };
}

interface BarcodeScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onBookFound: (book: GoogleBook) => void;
  onManualSearch: () => void;
}

type ScannerState = 'scanning' | 'looking_up' | 'not_found' | 'error';

export default function BarcodeScannerModal({
  visible,
  onClose,
  onBookFound,
  onManualSearch,
}: BarcodeScannerModalProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scannerState, setScannerState] = useState<ScannerState>('scanning');
  const [lastScannedISBN, setLastScannedISBN] = useState<string | null>(null);
  const isProcessingRef = useRef(false);

  // Animation for scan line
  const scanLinePosition = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      // Reset state when modal opens
      setScannerState('scanning');
      setLastScannedISBN(null);
      isProcessingRef.current = false;

      // Start scan line animation
      scanLinePosition.value = 0;
      scanLinePosition.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 2000, easing: Easing.linear }),
          withTiming(0, { duration: 2000, easing: Easing.linear })
        ),
        -1,
        false
      );
    }
  }, [visible]);

  const scanLineStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateY: scanLinePosition.value * (SCAN_AREA_SIZE - 4) },
      ],
    };
  });

  const handleBarcodeScanned = async (result: BarcodeScanningResult) => {
    // Prevent multiple scans while processing
    if (isProcessingRef.current || scannerState !== 'scanning') {
      return;
    }

    const scannedData = result.data;
    const normalizedISBN = normalizeISBN(scannedData);

    // Skip if it's the same ISBN we just scanned
    if (normalizedISBN === lastScannedISBN) {
      return;
    }

    // Validate ISBN format
    if (!isValidISBN(scannedData)) {
      return; // Silently ignore non-ISBN barcodes
    }

    isProcessingRef.current = true;
    setLastScannedISBN(normalizedISBN);
    setScannerState('looking_up');

    try {
      // Call Edge Function to look up ISBN
      const { data, error } = await supabase.functions.invoke('isbn-lookup', {
        body: { isbn: normalizedISBN },
      });

      if (error) {
        console.error('ISBN lookup error:', error);
        setScannerState('error');
        isProcessingRef.current = false;
        return;
      }

      if (data?.success && data?.book) {
        // Phase 8.3: Track successful scan
        AnalyticsService.bookScanned({ isbn: normalizedISBN, found: true });
        // Convert to GoogleBook format for compatibility
        const googleBook: GoogleBook = {
          id: data.book.id,
          volumeInfo: {
            title: data.book.title,
            authors: data.book.authors,
            imageLinks: data.book.thumbnail
              ? { thumbnail: data.book.thumbnail }
              : undefined,
          },
        };
        onBookFound(googleBook);
        onClose();
      } else {
        // Phase 8.3: Track failed scan
        AnalyticsService.bookScanned({ isbn: normalizedISBN, found: false });
        setScannerState('not_found');
      }
    } catch (err) {
      console.error('ISBN lookup failed:', err);
      setScannerState('error');
    }

    isProcessingRef.current = false;
  };

  const handleRescan = () => {
    setScannerState('scanning');
    setLastScannedISBN(null);
    isProcessingRef.current = false;
  };

  const handleManualSearch = () => {
    onManualSearch();
    onClose();
  };

  const handleRequestPermission = async () => {
    const result = await requestPermission();
    if (!result.granted) {
      Alert.alert(i18n.t('common.error'), i18n.t('scanner.permission_denied'));
    }
  };

  // Permission not yet determined
  if (!permission) {
    return (
      <Modal visible={visible} animationType="slide" transparent={false}>
        <SafeAreaView style={styles.container}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#fff" />
          </View>
        </SafeAreaView>
      </Modal>
    );
  }

  // Permission denied
  if (!permission.granted) {
    return (
      <Modal visible={visible} animationType="slide" transparent={false}>
        <SafeAreaView style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.title}>{i18n.t('scanner.title')}</Text>
            <View style={styles.closeButton} />
          </View>
          <View style={styles.permissionContainer}>
            <ScanBarcode size={64} color="#666" />
            <Text style={styles.permissionText}>
              {i18n.t('scanner.permission_denied')}
            </Text>
            <TouchableOpacity
              style={styles.permissionButton}
              onPress={handleRequestPermission}
            >
              <Text style={styles.permissionButtonText}>
                {i18n.t('common.ok')}
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.container}>
        {/* Camera View - wrapped in View with pointerEvents="none" to prevent touch capture */}
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{
              barcodeTypes: ['ean13', 'ean8'],
            }}
            onBarcodeScanned={
              scannerState === 'scanning' ? handleBarcodeScanned : undefined
            }
          />
        </View>

        {/* Overlay */}
        <View style={styles.overlay} pointerEvents="box-none">
          {/* Header */}
          <SafeAreaView edges={['top']} style={styles.headerSafeArea} pointerEvents="box-none">
            <View style={styles.header} pointerEvents="box-none">
              <GHTouchableOpacity
                onPress={() => {
                  onClose();
                }}
                style={styles.closeButton}
                hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                activeOpacity={0.6}
              >
                <X size={24} color="#fff" />
              </GHTouchableOpacity>
              <Text style={styles.title}>{i18n.t('scanner.title')}</Text>
              <View style={styles.closeButton} />
            </View>
          </SafeAreaView>

          {/* Scan Area */}
          <View style={styles.scanAreaContainer} pointerEvents="box-none">
            <View style={styles.scanArea} pointerEvents="box-none">
              {/* Corner indicators */}
              <View style={[styles.corner, styles.cornerTopLeft]} />
              <View style={[styles.corner, styles.cornerTopRight]} />
              <View style={[styles.corner, styles.cornerBottomLeft]} />
              <View style={[styles.corner, styles.cornerBottomRight]} />

              {/* Scan line */}
              {scannerState === 'scanning' && (
                <Animated.View style={[styles.scanLine, scanLineStyle]} />
              )}
            </View>
          </View>

          {/* Bottom Content */}
          <SafeAreaView edges={['bottom']} style={styles.bottomContainer}>
            {scannerState === 'scanning' && (
              <Text style={styles.instruction}>
                {i18n.t('scanner.instruction')}
              </Text>
            )}

            {scannerState === 'looking_up' && (
              <View style={styles.statusContainer}>
                <ActivityIndicator size="large" color="#fff" />
                <Text style={styles.statusText}>
                  {i18n.t('scanner.looking_up')}
                </Text>
              </View>
            )}

            {(scannerState === 'not_found' || scannerState === 'error') && (
              <View style={styles.notFoundContainer}>
                <BookX size={48} color="#ff6b6b" />
                <Text style={styles.notFoundTitle}>
                  {i18n.t('scanner.not_found_title')}
                </Text>
                <Text style={styles.notFoundMessage}>
                  {i18n.t('scanner.not_found_message')}
                </Text>
                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={handleRescan}
                  >
                    <RefreshCw size={20} color="#fff" />
                    <Text style={styles.actionButtonText}>
                      {i18n.t('scanner.rescan')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.secondaryButton]}
                    onPress={handleManualSearch}
                  >
                    <Search size={20} color="#333" />
                    <Text style={[styles.actionButtonText, styles.secondaryButtonText]}>
                      {i18n.t('scanner.manual_search')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </SafeAreaView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    zIndex: 10,
    elevation: 10,
  },
  headerSafeArea: {
    zIndex: 100,
    elevation: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    zIndex: 100,
    elevation: 100,
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    elevation: 1000,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  permissionText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
  permissionButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  permissionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  scanAreaContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanArea: {
    width: SCAN_AREA_SIZE,
    height: SCAN_AREA_SIZE,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderColor: '#fff',
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 8,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 8,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 8,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 8,
  },
  scanLine: {
    position: 'absolute',
    left: 8,
    right: 8,
    height: 2,
    backgroundColor: '#4CAF50',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 8,
  },
  bottomContainer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  instruction: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    opacity: 0.9,
  },
  statusContainer: {
    alignItems: 'center',
    gap: 16,
  },
  statusText: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
  },
  notFoundContainer: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 16,
    padding: 24,
    gap: 12,
  },
  notFoundTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  notFoundMessage: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  secondaryButton: {
    backgroundColor: '#fff',
  },
  secondaryButtonText: {
    color: '#333',
  },
});
