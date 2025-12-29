import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import OnboardingLayout from '../../components/onboarding/OnboardingLayout';
import PrimaryButton from '../../components/onboarding/PrimaryButton';
import { colors, typography, spacing, borderRadius } from '../../theme';

export default function OnboardingScreen12({ navigation, route }: any) {
  const { selectedBook, deadline, pledgeAmount } = route.params;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  };

  return (
    <OnboardingLayout
      currentStep={12}
      totalSteps={14}
      title="あなたのCOMMIT"
      subtitle="これが、あなたが自分に課した約束。"
      footer={
        <PrimaryButton
          label="この約束を有効化する"
          onPress={() => navigation.navigate('Onboarding13', route.params)}
        />
      }
    >
      <View style={styles.commitCard}>
        <View style={styles.commitItem}>
          <Ionicons name="book" size={24} color={colors.accent.primary} />
          <View style={styles.commitContent}>
            <Text style={styles.commitLabel}>読む本</Text>
            <Text style={styles.commitValue} numberOfLines={2}>
              {selectedBook?.volumeInfo?.title || '未選択'}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.commitItem}>
          <Ionicons name="time" size={24} color={colors.accent.primary} />
          <View style={styles.commitContent}>
            <Text style={styles.commitLabel}>期限</Text>
            <Text style={styles.commitValue}>{formatDate(deadline)}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.commitItem}>
          <Ionicons name="heart" size={24} color={colors.accent.primary} />
          <View style={styles.commitContent}>
            <Text style={styles.commitLabel}>覚悟金</Text>
            <Text style={styles.commitValue}>¥{pledgeAmount?.toLocaleString()}</Text>
            <Text style={styles.commitNote}>Room to Readに届けられます</Text>
          </View>
        </View>
      </View>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  commitCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginTop: spacing.lg,
  },
  commitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  commitContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  commitLabel: {
    color: colors.text.secondary,
    fontSize: typography.fontSize.caption,
    marginBottom: 4,
  },
  commitValue: {
    color: colors.text.primary,
    fontSize: typography.fontSize.body,
    fontWeight: typography.fontWeight.semibold,
  },
  commitNote: {
    color: colors.text.muted,
    fontSize: typography.fontSize.caption,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border.default,
  },
});
