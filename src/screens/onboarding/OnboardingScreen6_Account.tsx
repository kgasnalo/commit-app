import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Platform, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';
import { GoogleSignin, statusCodes, isErrorWithCode } from '@react-native-google-signin/google-signin';
import OnboardingLayout from '../../components/onboarding/OnboardingLayout';
import PrimaryButton from '../../components/onboarding/PrimaryButton';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { supabase, isSupabaseInitialized } from '../../lib/supabase';
import { ENV_INIT_ERROR, SUPABASE_URL, SUPABASE_ANON_KEY, GOOGLE_WEB_CLIENT_ID, GOOGLE_IOS_CLIENT_ID } from '../../config/env';
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

export default function OnboardingScreen6({ navigation, route }: any) {
  const { selectedBook, deadline, pledgeAmount = 0, currency = 'JPY', tsundokuCount } = route.params || {};
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'google' | 'apple' | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [usernameValid, setUsernameValid] = useState(false);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const authSucceededRef = useRef(false);

  const isPasswordValid = password.length >= 8 && /[a-zA-Z]/.test(password) && /[0-9]/.test(password);

  // メールアドレスの形式チェック
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  // Google Sign-In 初期化
  useEffect(() => {
    // SECURITY: Only log config status in dev (prevents credential exposure)
    if (__DEV__) {
      console.log('[OnboardingScreen6] Google Sign-In config check:', {
        webClientId: GOOGLE_WEB_CLIENT_ID ? 'SET' : 'UNDEFINED',
        iosClientId: GOOGLE_IOS_CLIENT_ID ? 'SET' : 'UNDEFINED',
        webClientIdLength: GOOGLE_WEB_CLIENT_ID?.length ?? 0,
        iosClientIdLength: GOOGLE_IOS_CLIENT_ID?.length ?? 0,
      });
    }

    if (GOOGLE_WEB_CLIENT_ID) {
      GoogleSignin.configure({
        webClientId: GOOGLE_WEB_CLIENT_ID,
        iosClientId: GOOGLE_IOS_CLIENT_ID,
        offlineAccess: true, // サーバー側でトークンを使用する場合に必要
        scopes: ['profile', 'email'], // 明示的にスコープを指定
      });
      if (__DEV__) console.log('[OnboardingScreen6] GoogleSignin.configure() called successfully');
    } else {
      if (__DEV__) console.warn('[OnboardingScreen6] GoogleSignin NOT configured - GOOGLE_WEB_CLIENT_ID is undefined');
    }
  }, []);

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

  const handleEmailSignup = async () => {
    // Supabase初期化チェック
    if (!isSupabaseInitialized()) {
      if (__DEV__) {
        Alert.alert(i18n.t('common.error'), `${i18n.t('errors.service_unavailable')}\n\n[Debug] ${getSupabaseErrorDetail()}`);
      } else {
        Alert.alert(i18n.t('common.error'), i18n.t('errors.service_unavailable'));
      }
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
      // username を含める: createUserRecordFromOnboardingData が読み取る
      await AsyncStorage.setItem('onboardingData', JSON.stringify({
        selectedBook,
        deadline,
        pledgeAmount,
        currency,
        tsundokuCount,
        username,
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
        // signUp はセッションを即座に作成する → onAuthStateChange(SIGNED_IN) が発火
        // onAuthStateChange → createUserRecordFromOnboardingData(AsyncStorageからusername読み取り) → スタック切り替え
        // Screen 6 は loading 状態を維持し、スタック切り替え時にアンマウントされる
        if (__DEV__) console.log('[EmailSignup] User created, waiting for stack switch via onAuthStateChange...');
      }
    } catch (error: unknown) {
      captureError(error, { location: 'OnboardingScreen6.handleEmailSignup' });
      Alert.alert(i18n.t('common.error'), getErrorMessage(error) || i18n.t('errors.account_creation'));
    } finally {
      setLoading(false);
    }
  };

  /**
   * Google Sign In (ネイティブ認証)
   * @react-native-google-signin/google-signin を使用してネイティブのGoogle認証を行い、
   * 取得したIDトークンをSupabaseに渡してセッションを確立
   *
   * これはWeb OAuthの「flow_state_not_found」エラーを回避するための実装
   */
  const handleGoogleSignIn = async () => {
    // Supabase初期化チェック
    if (!isSupabaseInitialized()) {
      if (__DEV__) {
        Alert.alert(i18n.t('common.error'), `${i18n.t('errors.service_unavailable')}\n\n[Debug] ${getSupabaseErrorDetail()}`);
      } else {
        Alert.alert(i18n.t('common.error'), i18n.t('errors.service_unavailable'));
      }
      return;
    }

    // Google Web Client ID チェック
    if (!GOOGLE_WEB_CLIENT_ID) {
      Alert.alert(i18n.t('common.error'), i18n.t('errors.google_signin_not_configured'));
      return;
    }

    setOauthLoading('google');
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

      // Google Play Services の確認（Android用、iOSでは何もしない）
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

      // ネイティブのGoogle認証ダイアログを表示
      const signInResult = await GoogleSignin.signIn();
      if (__DEV__) {
        console.log('[GoogleSignIn] signIn result:', JSON.stringify({
          hasData: !!signInResult.data,
          hasIdToken: !!signInResult.data?.idToken,
          idTokenLength: signInResult.data?.idToken?.length ?? 0,
          hasUser: !!signInResult.data?.user,
          userEmail: signInResult.data?.user?.email,
          hasServerAuthCode: !!(signInResult.data as any)?.serverAuthCode,
        }, null, 2));
      }

      // signIn()からidTokenが取得できなかった場合、getTokens()を試す
      let idToken = signInResult.data?.idToken;
      if (!idToken) {
        if (__DEV__) console.log('[GoogleSignIn] idToken not in signIn result, trying getTokens()...');
        try {
          const tokens = await GoogleSignin.getTokens();
          if (__DEV__) {
            console.log('[GoogleSignIn] getTokens result:', JSON.stringify({
              hasIdToken: !!tokens.idToken,
              idTokenLength: tokens.idToken?.length ?? 0,
              hasAccessToken: !!tokens.accessToken,
            }, null, 2));
          }
          idToken = tokens.idToken;
        } catch (tokenError) {
          if (__DEV__) console.error('[GoogleSignIn] getTokens failed:', tokenError);
        }
      }

      // それでもidTokenが取得できなかった場合はエラー
      if (!idToken) {
        if (__DEV__) {
          console.error('[GoogleSignIn] idToken is missing after all attempts');
          console.error('[GoogleSignIn] Config used:', {
            webClientId: GOOGLE_WEB_CLIENT_ID,
            iosClientId: GOOGLE_IOS_CLIENT_ID ? 'SET' : 'NOT_SET',
          });
        }
        captureError(new Error('Google Sign In: idToken not received'), {
          location: 'OnboardingScreen6.handleGoogleSignIn.idToken_missing',
          extra: {
            hasData: !!signInResult.data,
            hasUser: !!signInResult.data?.user,
            userEmail: signInResult.data?.user?.email,
            webClientIdSet: !!GOOGLE_WEB_CLIENT_ID,
            iosClientIdSet: !!GOOGLE_IOS_CLIENT_ID,
          },
        });
        throw new Error(i18n.t('errors.google_signin_token_failed'));
      }

      // Supabaseに IDトークンを渡してセッションを確立
      const { data: sessionData, error: sessionError } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
      });

      if (sessionError) {
        captureError(sessionError, { location: 'OnboardingScreen6.handleGoogleSignIn.signInWithIdToken' });
        Alert.alert(i18n.t('common.error'), i18n.t('errors.auth_failed'));
        setOauthLoading(null);
        return;
      }

      if (sessionData.user) {
        // 認証成功: ボタンを無効化し続ける（スタック切り替えまで）
        authSucceededRef.current = true;
        if (__DEV__) console.log('[GoogleSignIn] Session established, waiting for stack switch via onAuthStateChange...');
      }
    } catch (error: unknown) {
      // ユーザーがキャンセルした場合は何もしない
      if (isErrorWithCode(error) && error.code === statusCodes.SIGN_IN_CANCELLED) {
        if (__DEV__) console.log('[GoogleSignIn] User cancelled');
        setOauthLoading(null);
        return;
      }
      // Google Play Services が利用不可
      if (isErrorWithCode(error) && error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        Alert.alert(i18n.t('common.error'), i18n.t('errors.google_play_services_unavailable'));
        setOauthLoading(null);
        return;
      }
      captureError(error, { location: 'OnboardingScreen6.handleGoogleSignIn' });
      Alert.alert(i18n.t('common.error'), getErrorMessage(error));
      setOauthLoading(null);
    }
  };

  /**
   * Apple Sign In (ネイティブ認証)
   * expo-apple-authentication を使用してネイティブのApple認証を行い、
   * 取得したIDトークンをSupabaseに渡してセッションを確立
   */
  const handleAppleSignIn = async () => {
    // Supabase初期化チェック
    if (!isSupabaseInitialized()) {
      if (__DEV__) {
        Alert.alert(i18n.t('common.error'), `${i18n.t('errors.service_unavailable')}\n\n[Debug] ${getSupabaseErrorDetail()}`);
      } else {
        Alert.alert(i18n.t('common.error'), i18n.t('errors.service_unavailable'));
      }
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
        throw new Error(i18n.t('errors.apple_signin_token_failed'));
      }

      // Apple認証シートのdismissを待つ（iPad互換モードでのUI衝突を回避）
      await new Promise(resolve => setTimeout(resolve, 500));

      // Supabaseに IDトークンを渡してセッションを確立
      const { data: sessionData, error: sessionError } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      });

      if (sessionError) {
        captureError(sessionError, {
          location: 'OnboardingScreen6.handleAppleSignIn.signInWithIdToken',
          extra: {
            errorMessage: sessionError.message,
            errorStatus: (sessionError as any)?.status,
          },
        });
        Alert.alert(i18n.t('common.error'), i18n.t('errors.auth_failed'));
        setOauthLoading(null);
        return;
      }

      if (sessionData.user) {
        // 認証成功: ボタンを無効化し続ける（スタック切り替えまで）
        authSucceededRef.current = true;
        if (__DEV__) console.log('[AppleSignIn] Session established, waiting for stack switch via onAuthStateChange...');
      }
    } catch (error: unknown) {
      const errorCode = (error as { code?: string })?.code;
      const errorMessage = (error as Error)?.message;

      // 全エラーをSentryに送信（キャンセル含む、デバッグ用）
      captureError(error, {
        location: 'OnboardingScreen6.handleAppleSignIn',
        extra: { errorCode, errorMessage },
      });

      // ユーザーがキャンセルした場合は何もしない
      if (
        errorCode === 'ERR_REQUEST_CANCELED' ||
        errorCode === 'ERR_CANCELED' ||
        errorCode === 'ERR_REQUEST_UNKNOWN' ||
        errorCode === 'ERR_NOT_HANDLED_REQUEST'
      ) {
        if (__DEV__) console.log('[AppleSignIn] User cancelled or not handled:', errorCode);
        setOauthLoading(null);
        return;
      }
      // iPad互換モードやポップオーバー表示で発生しうるエラー
      if (
        errorCode === 'ERR_INVALID_RESPONSE' ||
        errorCode === 'ERR_NOT_AVAILABLE'
      ) {
        if (__DEV__) console.log('[AppleSignIn] Apple auth error:', errorCode, errorMessage);
        Alert.alert(i18n.t('common.error'), i18n.t('errors.apple_signin_unavailable'));
        setOauthLoading(null);
        return;
      }
      Alert.alert(i18n.t('common.error'), getErrorMessage(error));
      setOauthLoading(null);
    }
  };

  /**
   * OAuth認証のエントリーポイント
   * Apple: ネイティブ認証 (expo-apple-authentication)
   * Google: ネイティブ認証 (@react-native-google-signin/google-signin)
   */
  const handleOAuth = async (provider: 'google' | 'apple') => {
    if (provider === 'apple') {
      await handleAppleSignIn();
    } else {
      await handleGoogleSignIn();
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
          disabled={!username.trim() || !email.trim() || !isEmailValid || !isPasswordValid || !!usernameError || isCheckingUsername || !usernameValid}
        />
      }
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
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
          disabled={oauthLoading !== null || loading || authSucceededRef.current}
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
            disabled={oauthLoading !== null || loading || authSucceededRef.current}
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
      </ScrollView>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    paddingBottom: spacing.md,
  },
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
