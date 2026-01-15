import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import OnboardingLayout from '../../components/onboarding/OnboardingLayout';
import PrimaryButton from '../../components/onboarding/PrimaryButton';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { supabase } from '../../lib/supabase';
import i18n from '../../i18n';
import { getErrorMessage } from '../../utils/errorUtils';

// WebBrowserの結果を適切に処理するために必要
WebBrowser.maybeCompleteAuthSession();

export default function OnboardingScreen6({ navigation, route }: any) {
  const { selectedBook, deadline, pledgeAmount, currency = 'JPY', tsundokuCount } = route.params || {};
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'google' | 'apple' | null>(null);

  // リダイレクトURIの設定
  const redirectUri = makeRedirectUri({
    scheme: 'commitapp',
    path: 'auth/callback',
  });

  /**
   * ユーザーレコードをusersテーブルに同期（upsert）
   * Auth Triggerのタイミングに依存しない堅牢な実装
   */
  const syncUserToDatabase = async (
    userId: string,
    userEmail: string | undefined,
    displayName: string | null
  ): Promise<void> => {
    // emailが必須フィールドなので、存在しない場合は同期をスキップ
    if (!userEmail) {
      console.warn('syncUserToDatabase: email is required but not provided');
      return;
    }

    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // upsertで確実にレコードを作成/更新
        const { error: upsertError } = await supabase
          .from('users')
          .upsert(
            {
              id: userId,
              email: userEmail,
              username: displayName,
              subscription_status: 'inactive',
            },
            {
              onConflict: 'id',
              ignoreDuplicates: false, // 既存レコードを更新
            }
          );

        if (!upsertError) {
          return;
        }

        lastError = new Error(upsertError.message);
        console.warn(`User sync attempt ${attempt} failed:`, upsertError.message);
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        console.warn(`User sync attempt ${attempt} exception:`, lastError.message);
      }

      // 最後の試行でなければ少し待ってリトライ
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 200 * attempt));
      }
    }

    // 全リトライ失敗してもログだけ残して続行（後で設定可能）
    console.error('Failed to sync user after all retries:', lastError?.message);
  };

  const handleEmailSignup = async () => {
    if (!username.trim() || !email.trim() || !password.trim()) {
      Alert.alert(i18n.t('common.error'), i18n.t('errors.fill_all_fields'));
      return;
    }

    // パスワードの長さチェック
    if (password.length < 6) {
      Alert.alert(i18n.t('common.error'), i18n.t('errors.password_length'));
      return;
    }

    setLoading(true);
    try {

      // オンボーディングデータをAsyncStorageに保存
      // 認証後にAppNavigatorのスタックが切り替わるため、route.paramsが失われる
      await AsyncStorage.setItem('onboardingData', JSON.stringify({
        selectedBook,
        deadline,
        pledgeAmount,
        currency,
        tsundokuCount,
      }));

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        console.error('Signup error:', error);
        throw error;
      }

      if (data.user) {

        // upsertでusersテーブルにレコードを確実に同期
        // Auth Triggerのタイミングに依存しない堅牢な実装
        await syncUserToDatabase(data.user.id, email, username);


        // 次の画面に遷移（認証状態は保持される）
        navigation.navigate('Onboarding7', {
          selectedBook,
          deadline,
          pledgeAmount,
          currency,
          tsundokuCount,
          userId: data.user.id,
        });
      }
    } catch (error: unknown) {
      console.error('Signup flow error:', error);
      Alert.alert(i18n.t('common.error'), getErrorMessage(error) || i18n.t('errors.account_creation'));
    } finally {
      setLoading(false);
    }
  };

  /**
   * OAuth認証後のセッション確立処理
   * PKCE Flow（code）とImplicit Flow（access_token）の両方に対応
   */
  const handleOAuthCallback = async (callbackUrl: string): Promise<boolean> => {
    // URLパラメータを解析
    const urlObj = new URL(callbackUrl);
    const hashParams = new URLSearchParams(urlObj.hash.slice(1));
    const queryParams = urlObj.searchParams;

    // PKCE Flow: codeパラメータをチェック
    const code = queryParams.get('code');
    if (code) {
      const { data: sessionData, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);

      if (sessionError) {
        Alert.alert(i18n.t('common.error'), sessionError.message);
        return false;
      }

      if (sessionData.user) {
        await syncUserToDatabase(
          sessionData.user.id,
          sessionData.user.email,
          username || sessionData.user.user_metadata?.name || null
        );

        navigation.navigate('Onboarding7', {
          selectedBook,
          deadline,
          pledgeAmount,
          currency,
          tsundokuCount,
          userId: sessionData.user.id,
        });
        return true;
      }
      return false;
    }

    // Implicit Flow: access_token / refresh_token をチェック
    const access_token = hashParams.get('access_token') || queryParams.get('access_token');
    const refresh_token = hashParams.get('refresh_token') || queryParams.get('refresh_token');

    if (access_token && refresh_token) {
      const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
        access_token,
        refresh_token,
      });

      if (sessionError) {
        Alert.alert(i18n.t('common.error'), sessionError.message);
        return false;
      }

      if (sessionData.user) {
        await syncUserToDatabase(
          sessionData.user.id,
          sessionData.user.email,
          username || sessionData.user.user_metadata?.name || null
        );

        navigation.navigate('Onboarding7', {
          selectedBook,
          deadline,
          pledgeAmount,
          currency,
          tsundokuCount,
          userId: sessionData.user.id,
        });
        return true;
      }
    }

    // エラーチェック
    const errorDescription = queryParams.get('error_description') || hashParams.get('error_description');
    if (errorDescription) {
      Alert.alert(i18n.t('common.error'), errorDescription);
      return false;
    }

    console.warn('No authentication tokens found in callback URL');
    return false;
  };

  const handleOAuth = async (provider: 'google' | 'apple') => {
    // Apple Sign Inは別途セットアップが必要
    if (provider === 'apple') {
      Alert.alert(i18n.t('common.coming_soon'), i18n.t('errors.oauth_coming_soon', { provider: 'Apple' }));
      return;
    }

    setOauthLoading(provider);
    try {
      // オンボーディングデータをAsyncStorageに保存
      // username を含めることで、Deep Link 経由で AppNavigator に戻った場合でも
      // ユーザー名を取得して users テーブルにレコードを作成できる
      await AsyncStorage.setItem('onboardingData', JSON.stringify({
        selectedBook,
        deadline,
        pledgeAmount,
        currency,
        tsundokuCount,
        username, // OAuth後にAppNavigatorで使用
      }));

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'commitapp://',
          // openAuthSessionAsyncがブラウザライフサイクルを管理するため、
          // Supabaseによる自動リダイレクトをスキップ
          skipBrowserRedirect: true,
        },
      });

      if (error) {
        Alert.alert(i18n.t('common.error'), error.message);
        return;
      }

      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectUri
        );

        if (result.type === 'success') {
          await handleOAuthCallback(result.url);
        } else if (result.type === 'cancel') {
          // ユーザーがキャンセルした場合は何もしない
        }
      }
    } catch (error: unknown) {
      Alert.alert(i18n.t('common.error'), getErrorMessage(error));
    } finally {
      setOauthLoading(null);
    }
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
          <Text style={styles.inputNote}>{i18n.t('onboarding.screen6_username_note')}</Text>
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
          style={[styles.oauthButton, oauthLoading === 'google' && styles.oauthButtonDisabled]}
          onPress={() => handleOAuth('google')}
          disabled={oauthLoading !== null || loading}
        >
          {oauthLoading === 'google' ? (
            <ActivityIndicator size="small" color={colors.text.primary} />
          ) : (
            <>
              <Ionicons name="logo-google" size={20} color={colors.text.primary} />
              <Text style={styles.oauthButtonText}>{i18n.t('onboarding.screen6_google')}</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.oauthButton, oauthLoading === 'apple' && styles.oauthButtonDisabled]}
          onPress={() => handleOAuth('apple')}
          disabled={oauthLoading !== null || loading}
        >
          {oauthLoading === 'apple' ? (
            <ActivityIndicator size="small" color={colors.text.primary} />
          ) : (
            <>
              <Ionicons name="logo-apple" size={20} color={colors.text.primary} />
              <Text style={styles.oauthButtonText}>{i18n.t('onboarding.screen6_apple')}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
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
  inputNote: {
    color: colors.text.muted,
    fontSize: typography.fontSize.caption,
    marginTop: 4,
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
  oauthButtonDisabled: {
    opacity: 0.6,
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
