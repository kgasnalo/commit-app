import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import OnboardingLayout from '../../components/onboarding/OnboardingLayout';
import PrimaryButton from '../../components/onboarding/PrimaryButton';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { supabase } from '../../lib/supabase';
import i18n from '../../i18n';
import { getErrorMessage } from '../../utils/errorUtils';

export default function OnboardingScreen6({ navigation, route }: any) {
  const { selectedBook, deadline, pledgeAmount, currency = 'JPY' } = route.params;
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEmailSignup = async () => {
    if (!username.trim() || !email.trim() || !password.trim()) {
      Alert.alert(i18n.t('common.error'), i18n.t('errors.fill_all_fields', { defaultValue: '全ての項目を入力してください' }));
      return;
    }

    // パスワードの長さチェック
    if (password.length < 6) {
      Alert.alert(i18n.t('common.error'), i18n.t('errors.password_length', { defaultValue: 'パスワードは6文字以上で入力してください' }));
      return;
    }

    setLoading(true);
    try {
      console.log('Starting signup process...');

      // オンボーディングデータをAsyncStorageに保存
      // 認証後にAppNavigatorのスタックが切り替わるため、route.paramsが失われる
      await AsyncStorage.setItem('onboardingData', JSON.stringify({
        selectedBook,
        deadline,
        pledgeAmount,
        currency,
      }));
      console.log('Onboarding data saved to AsyncStorage');

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        console.error('Signup error:', error);
        throw error;
      }

      if (data.user) {
        console.log('User created:', data.user.id);

        // トリガーがpublic.usersにレコードを自動作成するので、
        // ここではusernameをUPDATEするだけ
        // 少し待ってからUPDATE（トリガーの完了を待つ）
        await new Promise(resolve => setTimeout(resolve, 500));

        const { error: updateError } = await supabase
          .from('users')
          .update({ username: username })
          .eq('id', data.user.id);

        if (updateError) {
          console.error('Username update error:', updateError);
          // usernameの更新エラーは無視して続行（後で設定可能）
        }

        console.log('Username updated, navigating to next screen...');

        // 次の画面に遷移（認証状態は保持される）
        navigation.navigate('Onboarding7', {
          selectedBook,
          deadline,
          pledgeAmount,
          userId: data.user.id,
        });
      }
    } catch (error: unknown) {
      console.error('Signup flow error:', error);
      Alert.alert(i18n.t('common.error'), getErrorMessage(error) || i18n.t('errors.account_creation', { defaultValue: 'アカウント作成に失敗しました' }));
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: 'google' | 'apple') => {
    // OAuth実装（後で追加）
    Alert.alert(i18n.t('common.coming_soon', { defaultValue: '準備中' }), i18n.t('errors.oauth_coming_soon', { defaultValue: `${provider}ログインは準備中です` }));
  };

  return (
    <OnboardingLayout
      currentStep={6}
      totalSteps={14}
      title={i18n.t('onboarding.screen6_title')}
      subtitle={i18n.t('onboarding.screen6_subtitle')}
      footer={
        <PrimaryButton
          label={i18n.t('onboarding.screen6_create_account')}
          onPress={handleEmailSignup}
          loading={loading}
          disabled={!username || !email || !password}
        />
      }
    >
      <View style={styles.form}>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>{i18n.t('onboarding.screen6_username')}</Text>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={setUsername}
            placeholder="your_username"
            placeholderTextColor={colors.text.muted}
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>{i18n.t('onboarding.screen6_email')}</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor={colors.text.muted}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>{i18n.t('onboarding.screen6_password')}</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor={colors.text.muted}
            secureTextEntry
          />
        </View>
      </View>

      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>{i18n.t('onboarding.screen6_or')}</Text>
        <View style={styles.dividerLine} />
      </View>

      <View style={styles.oauthButtons}>
        <TouchableOpacity
          style={styles.oauthButton}
          onPress={() => handleOAuth('google')}
        >
          <Ionicons name="logo-google" size={20} color={colors.text.primary} />
          <Text style={styles.oauthButtonText}>{i18n.t('onboarding.screen6_google')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.oauthButton}
          onPress={() => handleOAuth('apple')}
        >
          <Ionicons name="logo-apple" size={20} color={colors.text.primary} />
          <Text style={styles.oauthButtonText}>{i18n.t('onboarding.screen6_apple')}</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.note}>{i18n.t('onboarding.screen6_username_note')}</Text>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: spacing.md,
  },
  inputContainer: {
    marginBottom: spacing.sm,
  },
  label: {
    color: colors.text.secondary,
    fontSize: typography.fontSize.caption,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.background.tertiary,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: borderRadius.md,
    height: 52,
    paddingHorizontal: spacing.md,
    color: colors.text.primary,
    fontSize: typography.fontSize.body,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border.default,
  },
  dividerText: {
    color: colors.text.muted,
    fontSize: typography.fontSize.caption,
    marginHorizontal: spacing.md,
  },
  oauthButtons: {
    gap: spacing.sm,
  },
  oauthButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: borderRadius.md,
    height: 52,
    gap: spacing.sm,
  },
  oauthButtonText: {
    color: colors.text.primary,
    fontSize: typography.fontSize.body,
    fontWeight: typography.fontWeight.semibold,
  },
  note: {
    color: colors.text.muted,
    fontSize: typography.fontSize.caption,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
});
