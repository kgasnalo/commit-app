import React, { useState, useRef } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import * as AppleAuthentication from 'expo-apple-authentication';
import OnboardingLayout from '../../components/onboarding/OnboardingLayout';
import PrimaryButton from '../../components/onboarding/PrimaryButton';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { supabase, isSupabaseInitialized } from '../../lib/supabase';
import { ENV_INIT_ERROR, SUPABASE_URL, SUPABASE_ANON_KEY } from '../../config/env';
import i18n from '../../i18n';

/**
 * デバッグ用: Supabase初期化エラーの詳細を取得
 */
function getSupabaseErrorDetail(): string {
  if (ENV_INIT_ERROR) {
    return `ENV Error: ${ENV_INIT_ERROR}`;
  }
  const missing: string[] = [];
  if (!SUPABASE_URL) missing.push('SUPABASE_URL');
  if (!SUPABASE_ANON_KEY) missing.push('SUPABASE_ANON_KEY');
  if (missing.length > 0) {
    return `Missing: ${missing.join(', ')}`;
  }
  return 'Unknown initialization error';
}
import { getErrorMessage } from '../../utils/errorUtils';
import { captureError } from '../../utils/errorLogger';
import { validateUsernameFormat, checkUsernameAvailability } from '../../utils/usernameValidator';

// WebBrowserの結果を適切に処理するために必要
WebBrowser.maybeCompleteAuthSession();

export default function OnboardingScreen6({ navigation, route }: any) {
  const { selectedBook, deadline, pledgeAmount, currency = 'JPY', tsundokuCount } = route.params || {};
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'google' | 'apple' | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [usernameValid, setUsernameValid] = useState(false);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isPasswordValid = password.length >= 8 && /[a-zA-Z]/.test(password) && /[0-9]/.test(password);

  // メールアドレスの形式チェック
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const handleUsernameChange = (value: string) => {
    setUsername(value);
    setUsernameError(null);
    setUsernameValid(false);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.trim().length === 0) {
      setIsCheckingUsername(false);
      return;
    }

    const formatCheck = validateUsernameFormat(value);
    if (!formatCheck.isValid) {
      setUsernameError(i18n.t(formatCheck.errorKey!));
      setIsCheckingUsername(false);
      return;
    }

    setIsCheckingUsername(true);
    debounceRef.current = setTimeout(async () => {
      const result = await checkUsernameAvailability(value);
      setIsCheckingUsername(false);
      if (!result.isValid) {
        setUsernameError(i18n.t(result.errorKey!));
      } else {
        setUsernameValid(true);
      }
    }, 500);
  };

  // リダイレクトURIの設定
  const redirectUri = makeRedirectUri({
    scheme: 'commitapp',
    path: 'auth/callback',
  });

  /**
   * displayNameをDB制約に合わせてサニタイズ
   * 制約: ^[a-zA-Z0-9_]{3,20}$
   */
  const sanitizeUsername = (displayName: string | null, fallbackId: string): string => {
    if (!displayName) {
      return 'user_' + fallbackId.substring(0, 8);
    }

    // スペースをアンダースコアに変換、許可されない文字を除去
    let sanitized = displayName
      .replace(/\s+/g, '_')           // スペース → アンダースコア
      .replace(/[^a-zA-Z0-9_]/g, '')  // 英数字とアンダースコア以外を除去
      .substring(0, 20);               // 最大20文字

    // 最小3文字を保証
    if (sanitized.length < 3) {
      sanitized = 'user_' + fallbackId.substring(0, 8);
    }

    return sanitized;
  };

  /**
   * ユーザーレコードをusersテーブルに同期（upsert）
   * Auth Triggerのタイミングに依存しない堅牢な実装
   */
  const syncUserToDatabase = async (
    userId: string,
    userEmail: string | undefined,
    displayName: string | null
  ): Promise<void> => {
    // Supabase初期化チェック
    if (!isSupabaseInitialized()) {
      if (__DEV__) console.warn('syncUserToDatabase: Supabase not initialized');
      return;
    }

    // emailが必須フィールドなので、存在しない場合は同期をスキップ
    if (!userEmail) {
      if (__DEV__) console.warn('syncUserToDatabase: email is required but not provided');
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
              username: sanitizeUsername(displayName, userId),
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
        if (__DEV__) console.warn(`User sync attempt ${attempt} failed:`, upsertError.message);
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (__DEV__) console.warn(`User sync attempt ${attempt} exception:`, lastError.message);
      }

      // 最後の試行でなければ少し待ってリトライ
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 200 * attempt));
      }
    }

    // 全リトライ失敗してもログだけ残して続行（後で設定可能）
    captureError(lastError || new Error('Unknown sync error'), {
      location: 'OnboardingScreen6.syncUserToDatabase',
      extra: { userId, retries: maxRetries },
    });
  };

  const handleEmailSignup = async () => {
    // Supabase初期化チェック
    if (!isSupabaseInitialized()) {
      Alert.alert(
        i18n.t('common.error'),
        `${i18n.t('errors.service_unavailable')}\n\n[Debug] ${getSupabaseErrorDetail()}`
      );
      return;
    }

    if (!username.trim() || !email.trim() || !password.trim()) {
      Alert.alert(i18n.t('common.error'), i18n.t('errors.fill_all_fields'));
      return;
    }

    // ユーザー名バリデーション
    const formatCheck = validateUsernameFormat(username);
    if (!formatCheck.isValid) {
      Alert.alert(i18n.t('common.error'), i18n.t(formatCheck.errorKey!));
      return;
    }

    // メールアドレス形式バリデーション
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      Alert.alert(i18n.t('common.error'), i18n.t('errors.invalid_email_format'));
      return;
    }

    // パスワードバリデーション: 8文字以上、英字と数字の両方を含む
    if (password.length < 8) {
      Alert.alert(i18n.t('common.error'), i18n.t('errors.password_too_short'));
      return;
    }
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    if (!hasLetter || !hasNumber) {
      Alert.alert(i18n.t('common.error'), i18n.t('errors.password_requirements'));
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
        captureError(error, { location: 'OnboardingScreen6.handleEmailSignup' });
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
      captureError(error, { location: 'OnboardingScreen6.handleEmailSignup' });
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
    // Supabase初期化チェック
    if (!isSupabaseInitialized()) {
      Alert.alert(
        i18n.t('common.error'),
        `${i18n.t('errors.service_unavailable')}\n\n[Debug] ${getSupabaseErrorDetail()}`
      );
      return false;
    }

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

    if (__DEV__) console.warn('No authentication tokens found in callback URL');
    return false;
  };

  /**
   * Apple Sign In (ネイティブ認証)
   * expo-apple-authentication を使用してネイティブのApple認証を行い、
   * 取得したIDトークンをSupabaseに渡してセッションを確立
   */
  const handleAppleSignIn = async () => {
    // Supabase初期化チェック
    if (!isSupabaseInitialized()) {
      Alert.alert(
        i18n.t('common.error'),
        `${i18n.t('errors.service_unavailable')}\n\n[Debug] ${getSupabaseErrorDetail()}`
      );
      return;
    }

    // iOS以外では使用不可
    if (Platform.OS !== 'ios') {
      Alert.alert(i18n.t('common.error'), i18n.t('errors.apple_signin_ios_only'));
      return;
    }

    // Apple認証が利用可能かチェック
    const isAvailable = await AppleAuthentication.isAvailableAsync();
    if (!isAvailable) {
      Alert.alert(i18n.t('common.error'), i18n.t('errors.apple_signin_unavailable'));
      return;
    }

    setOauthLoading('apple');
    try {
      // オンボーディングデータをAsyncStorageに保存
      await AsyncStorage.setItem('onboardingData', JSON.stringify({
        selectedBook,
        deadline,
        pledgeAmount,
        currency,
        tsundokuCount,
        username,
      }));

      // ネイティブのApple認証ダイアログを表示
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      // identityTokenが取得できなかった場合はエラー
      if (!credential.identityToken) {
        throw new Error('Apple Sign In: identityToken not received');
      }

      // Supabaseに IDトークンを渡してセッションを確立
      const { data: sessionData, error: sessionError } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      });

      if (sessionError) {
        captureError(sessionError, { location: 'OnboardingScreen6.handleAppleSignIn.signInWithIdToken' });
        Alert.alert(i18n.t('common.error'), sessionError.message);
        return;
      }

      if (sessionData.user) {
        // Apple認証では初回のみfullNameが返される
        // credential.fullName からユーザー名を取得（なければusernameフィールドを使用）
        const appleFullName = credential.fullName
          ? [credential.fullName.givenName, credential.fullName.familyName].filter(Boolean).join(' ')
          : null;
        const displayName = username || appleFullName || null;

        await syncUserToDatabase(
          sessionData.user.id,
          sessionData.user.email,
          displayName
        );

        navigation.navigate('Onboarding7', {
          selectedBook,
          deadline,
          pledgeAmount,
          currency,
          tsundokuCount,
          userId: sessionData.user.id,
        });
      }
    } catch (error: unknown) {
      // ユーザーがキャンセルした場合は何もしない
      if ((error as { code?: string })?.code === 'ERR_REQUEST_CANCELED') {
        return;
      }
      captureError(error, { location: 'OnboardingScreen6.handleAppleSignIn' });
      Alert.alert(i18n.t('common.error'), getErrorMessage(error));
    } finally {
      setOauthLoading(null);
    }
  };

  const handleOAuth = async (provider: 'google' | 'apple') => {
    // Apple Sign In はネイティブ認証を使用
    if (provider === 'apple') {
      await handleAppleSignIn();
      return;
    }

    // Supabase初期化チェック（Google OAuth用）
    if (!isSupabaseInitialized()) {
      Alert.alert(
        i18n.t('common.error'),
        `${i18n.t('errors.service_unavailable')}\n\n[Debug] ${getSupabaseErrorDetail()}`
      );
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
      currentStep={7}
      totalSteps={15}
      title={i18n.t('onboarding.screen6_title')}
      subtitle={i18n.t('onboarding.screen6_subtitle')}
      footer={
        <PrimaryButton
          label={i18n.t('onboarding.screen6_create_account')}
          onPress={handleEmailSignup}
          loading={loading}
          disabled={!username.trim() || !email.trim() || !isEmailValid || !isPasswordValid || !!usernameError || isCheckingUsername || !usernameValid}
        />
      }
    >
      <View style={styles.form}>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>{i18n.t('onboarding.screen6_username')}</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={[
                styles.input,
                usernameError ? styles.inputError : null,
                usernameValid ? styles.inputValid : null,
              ]}
              value={username}
              onChangeText={handleUsernameChange}
              placeholder="your_username"
              placeholderTextColor={colors.text.muted}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={20}
            />
            {isCheckingUsername && (
              <ActivityIndicator
                size="small"
                color={colors.text.muted}
                style={styles.inputIndicator}
              />
            )}
          </View>
          <Text style={styles.inputNote}>{i18n.t('onboarding.screen6_username_note')}</Text>
          {usernameError && (
            <Text style={styles.inputErrorText}>{usernameError}</Text>
          )}
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
          <Text style={styles.inputNote}>{i18n.t('onboarding.screen6_password_note')}</Text>
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

        {/* Apple Sign In - iOS のみ表示 */}
        {Platform.OS === 'ios' && (
          <TouchableOpacity
            style={[styles.oauthButton, styles.appleButton, oauthLoading === 'apple' && styles.oauthButtonDisabled]}
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
        )}
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
  inputWrapper: {
    position: 'relative' as const,
  },
  inputError: {
    borderColor: '#FF3D00',
  },
  inputValid: {
    borderColor: '#4CAF50',
  },
  inputIndicator: {
    position: 'absolute' as const,
    right: 16,
    top: 16,
  },
  inputNote: {
    color: colors.text.muted,
    fontSize: typography.fontSize.caption,
    marginTop: 4,
  },
  inputErrorText: {
    color: '#FF3D00',
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
  appleButton: {
    // Apple ボタン用の追加スタイル（必要に応じて調整可能）
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
