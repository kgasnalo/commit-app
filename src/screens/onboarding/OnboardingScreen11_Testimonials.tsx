import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import OnboardingLayout from '../../components/onboarding/OnboardingLayout';
import PrimaryButton from '../../components/onboarding/PrimaryButton';
import { colors, typography, spacing, borderRadius } from '../../theme';

const TESTIMONIALS = [
  {
    name: 'Taro S.',
    role: '34歳・経営者',
    text: '積読が30冊あったのに、3ヶ月で全部消化できた。ペナルティがあると本気になる。',
  },
  {
    name: 'Yuki M.',
    role: '29歳・投資家',
    text: '意志力に頼らない仕組みが良い。失敗しても寄付になるから罪悪感がない。',
  },
  {
    name: 'Ken T.',
    role: '41歳・コンサルタント',
    text: '週1冊ペースで読めるようになった。年間50冊、人生変わった。',
  },
];

export default function OnboardingScreen11({ navigation, route }: any) {
  return (
    <OnboardingLayout
      currentStep={11}
      totalSteps={13}
      title="COMMITを使った人たちの声"
      footer={
        <PrimaryButton
          label="次へ"
          onPress={() => navigation.navigate('Onboarding12', route.params)}
        />
      }
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        {TESTIMONIALS.map((testimonial, index) => (
          <View key={index} style={styles.testimonialCard}>
            <View style={styles.header}>
              <View style={styles.avatar}>
                <Ionicons name="person" size={20} color={colors.text.muted} />
              </View>
              <View>
                <Text style={styles.name}>{testimonial.name}</Text>
                <Text style={styles.role}>{testimonial.role}</Text>
              </View>
            </View>
            <Text style={styles.text}>{testimonial.text}</Text>
          </View>
        ))}
      </ScrollView>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  testimonialCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  name: {
    color: colors.text.primary,
    fontSize: typography.fontSize.body,
    fontWeight: typography.fontWeight.semibold,
  },
  role: {
    color: colors.text.secondary,
    fontSize: typography.fontSize.caption,
  },
  text: {
    color: colors.text.primary,
    fontSize: typography.fontSize.body,
    lineHeight: typography.fontSize.body * 1.6,
  },
});
