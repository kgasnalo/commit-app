import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  interpolate,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { HAPTIC_BUTTON_SCALES } from '../config/haptics';
import { colors } from '../theme';
import { Currency, GoogleBook } from '../types/commitment.types';

// Vignette intensity mapping (0-4 tiers)
const VIGNETTE_INTENSITY = [0, 0.3, 0.5, 0.7, 0.9];

const AMOUNTS_BY_CURRENCY: Record<Currency, number[]> = {
  JPY: [1000, 3000, 5000, 10000],
  USD: [7, 20, 35, 70],
  EUR: [6, 18, 30, 60],
  GBP: [5, 15, 25, 50],
  KRW: [9000, 27000, 45000, 90000],
};

const getAmountTierIndex = (amount: number | null, currency: Currency): number => {
  if (amount === null) return 0;
  const amounts = AMOUNTS_BY_CURRENCY[currency];
  const index = amounts.indexOf(amount);
  return index === -1 ? 0 : index + 1;
};

interface UseCommitmentFormParams {
  selectedBook: GoogleBook | null;
}

export function useCommitmentForm({ selectedBook }: UseCommitmentFormParams) {
  const [deadline, setDeadline] = useState<Date>(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [agreedToPenalty, setAgreedToPenalty] = useState(false);
  const [pledgeAmount, setPledgeAmount] = useState<number | null>(null);
  const [currency, setCurrency] = useState<Currency>('JPY');
  const [pageCount, setPageCount] = useState<number>(100);

  // Animation Shared Values
  const vignetteIntensity = useSharedValue(0);
  const pulseScale = useSharedValue(1);
  const buttonPressScale = useSharedValue(1);

  // Vignette Effect - darken corners as penalty amount increases
  useEffect(() => {
    const tierIndex = getAmountTierIndex(pledgeAmount, currency);
    const targetIntensity = VIGNETTE_INTENSITY[tierIndex];

    vignetteIntensity.value = withTiming(targetIntensity, {
      duration: 400,
      easing: Easing.out(Easing.cubic),
    });
  }, [pledgeAmount, currency]);

  // Pulse Animation - heartbeat effect on create button when ready
  useEffect(() => {
    if (pledgeAmount !== null && selectedBook && agreedToPenalty) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.02, { duration: 500, easing: Easing.out(Easing.ease) }),
          withTiming(1.0, { duration: 500, easing: Easing.in(Easing.ease) }),
        ),
        -1,
        false
      );
    } else {
      pulseScale.value = withTiming(1, { duration: 200 });
    }

    return () => {
      cancelAnimation(pulseScale);
    };
  }, [pledgeAmount, selectedBook, agreedToPenalty]);

  // Animated style for create button (combines pulse + press scale)
  const createButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value * buttonPressScale.value }],
    shadowOpacity: interpolate(pulseScale.value, [1, 1.02], [0, 0.8]),
    shadowRadius: interpolate(pulseScale.value, [1, 1.02], [0, 10]),
    shadowColor: colors.signal.active,
  }));

  const handleCreateButtonPressIn = () => {
    buttonPressScale.value = withTiming(HAPTIC_BUTTON_SCALES.heavy.pressed, { duration: 100 });
  };

  const handleCreateButtonPressOut = () => {
    buttonPressScale.value = withTiming(1, { duration: 100 });
  };

  const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);
      setDeadline(endOfDay);
    }
  };

  return {
    deadline,
    setDeadline,
    showDatePicker,
    setShowDatePicker,
    agreedToPenalty,
    setAgreedToPenalty,
    pledgeAmount,
    setPledgeAmount,
    currency,
    setCurrency,
    pageCount,
    setPageCount,
    vignetteIntensity,
    createButtonAnimatedStyle,
    handleCreateButtonPressIn,
    handleCreateButtonPressOut,
    handleDateChange,
  };
}
