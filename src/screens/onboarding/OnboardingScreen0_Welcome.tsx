import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '../../theme';

export default function OnboardingScreen0({ navigation }: any) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* ロゴ/アイコン */}
        <View style={styles.logoContainer}>
          <View style={styles.iconCircle}>
            <Ionicons name="book" size={48} color={colors.accent.primary} />
          </View>
          <Text style={styles.appName}>COMMIT</Text>
        </View>

        {/* メインコピー */}
        <View style={styles.copyContainer}>
          <Text style={styles.headline}>
            読めなかったら、{'\n'}子どもの学びに変わる。
          </Text>
          <Text style={styles.subheadline}>
            締切と覚悟で、読み切る仕組みを作ろう。{'\n'}
            失敗しても、誰かの未来になる。
          </Text>
        </View>

        {/* 寄付先の説明 */}
        <View style={styles.donationInfo}>
          <Ionicons name="heart" size={20} color={colors.accent.primary} />
          <Text style={styles.donationText}>
            読了できなかった場合の覚悟金は{'\n'}
            Room to Read（子どもの教育支援）に届けられます
          </Text>
        </View>
      </View>

      {/* CTA */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.navigate('Onboarding1')}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryButtonText}>始める</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.navigate('Auth')}
          activeOpacity={0.7}
        >
          <Text style={styles.secondaryButtonText}>
            すでにアカウントをお持ちの方
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  appName: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.text.primary,
    letterSpacing: 4,
  },
  copyContainer: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  headline: {
    fontSize: typography.fontSize.headingLarge,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    textAlign: 'center',
    lineHeight: typography.fontSize.headingLarge * 1.3,
    marginBottom: spacing.md,
  },
  subheadline: {
    fontSize: typography.fontSize.body,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: typography.fontSize.body * 1.6,
  },
  donationInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  donationText: {
    flex: 1,
    fontSize: typography.fontSize.caption,
    color: colors.text.secondary,
    lineHeight: typography.fontSize.caption * 1.6,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  primaryButton: {
    backgroundColor: colors.accent.primary,
    height: 56,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: colors.text.primary,
    fontSize: typography.fontSize.button,
    fontWeight: typography.fontWeight.semibold,
  },
  secondaryButton: {
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: colors.text.secondary,
    fontSize: typography.fontSize.caption,
  },
});
