import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseInitialized } from '../lib/supabase';
import { ENV_INIT_ERROR, SUPABASE_URL, SUPABASE_ANON_KEY, GOOGLE_WEB_CLIENT_ID, GOOGLE_IOS_CLIENT_ID } from '../config/env';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { GoogleSignin, statusCodes, isErrorWithCode } from '@react-native-google-signin/google-signin';
import * as AppleAuthentication from 'expo-apple-authentication';
import { captureError } from '../utils/errorLogger';

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
import { getErrorMessage } from '../utils/errorUtils';
import i18n from '../i18n';

export default function AuthScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  // Google Sign-In 初期化
  useEffect(() => {
    // SECURITY: Only log config status in dev (prevents credential exposure)
    if (__DEV__) {
      console.log('[AuthScreen] Google Sign-In config check:', {
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
        offlineAccess: true,
        scopes: ['profile', 'email'], // 明示的にスコープを指定
      });
      if (__DEV__) console.log('[AuthScreen] GoogleSignin.configure() called successfully');
    } else {
      if (__DEV__) console.warn('[AuthScreen] GoogleSignin NOT configured - GOOGLE_WEB_CLIENT_ID is undefined');
    }
  }, []);

  async function handleAuth() {
    // Supabase初期化チェック
    if (!isSupabaseInitialized()) {
      if (__DEV__) {
        Alert.alert(i18n.t('common.error'), `${i18n.t('errors.service_unavailable')}\n\n[Debug] ${getSupabaseErrorDetail()}`);
      } else {
        Alert.alert(i18n.t('common.error'), i18n.t('errors.service_unavailable'));
      }
      return;
    }

    if (!email || !password) {
      Alert.alert(i18n.t('common.error'), i18n.t('auth.error_empty_fields'));
      return;
    }

    setLoading(true);
    if (isSignUp) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        Alert.alert(i18n.t('auth.error_signup'), __DEV__ ? error.message : i18n.t('errors.auth_failed'));
      } else if (data.user && data.user.email) {
        // usersテーブルにレコードを作成（upsertでrace condition対策）
        const { error: insertError } = await supabase
          .from('users')
          .upsert(
            {
              id: data.user.id,
              email: data.user.email,
              username: 'user_' + data.user.id.substring(0, 8),
              subscription_status: 'inactive',
            },
            { onConflict: 'id' }
          );

        if (insertError) {
          if (__DEV__) console.error('Failed to create user record:', insertError);
          captureError(insertError, { location: 'AuthScreen.handleAuth.signUp.insert' });
        }
        Alert.alert(i18n.t('common.success'), i18n.t('auth.success_email_sent'));
      }
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        Alert.alert(i18n.t('auth.error_login'), __DEV__ ? error.message : i18n.t('errors.auth_failed'));
      } else if (data.user) {
        // ログイン時にusersテーブルのレコードが存在するか確認
        const { data: userData, error: checkError } = await supabase
          .from('users')
          .select('id')
          .eq('id', data.user.id)
          .maybeSingle();

        // レコードが存在しない場合は作成（upsertでrace condition対策）
        if (!userData && !checkError && data.user.email) {
          await supabase
            .from('users')
            .upsert(
              {
                id: data.user.id,
                email: data.user.email,
                username: 'user_' + data.user.id.substring(0, 8),
                subscription_status: 'inactive',
              },
              { onConflict: 'id' }
            );
        }
      }
    }
    setLoading(false);
  }

  /**
   * Google Sign In (ネイティブ認証)
   * @react-native-google-signin/google-signin を使用してネイティブのGoogle認証を行い、
   * 取得したIDトークンをSupabaseに渡してセッションを確立
   *
   * Web OAuth の「flow_state_not_found」エラーを回避するための実装
   */
  async function handleGoogleSignIn() {
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

    setLoading(true);
    try {
      // Auth画面からのログインであることを識別するフラグを設定
      await AsyncStorage.setItem('loginSource', 'auth_screen');

      // Google Play Services の確認（Android用、iOSでは何もしない）
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

      // ネイティブのGoogle認証ダイアログを表示
      if (__DEV__) console.log('[AuthScreen] Starting native Google Sign-In...');
      const signInResult = await GoogleSignin.signIn();
      if (__DEV__) {
        console.log('[AuthScreen] GoogleSignin.signIn result:', JSON.stringify({
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
        if (__DEV__) console.log('[AuthScreen] idToken not in signIn result, trying getTokens()...');
        try {
          const tokens = await GoogleSignin.getTokens();
          if (__DEV__) {
            console.log('[AuthScreen] getTokens result:', JSON.stringify({
              hasIdToken: !!tokens.idToken,
              idTokenLength: tokens.idToken?.length ?? 0,
              hasAccessToken: !!tokens.accessToken,
            }, null, 2));
          }
          idToken = tokens.idToken;
        } catch (tokenError) {
          if (__DEV__) console.error('[AuthScreen] getTokens failed:', tokenError);
        }
      }

      // それでもidTokenが取得できなかった場合はエラー
      if (!idToken) {
        if (__DEV__) {
          console.error('[AuthScreen] idToken is missing after all attempts');
          console.error('[AuthScreen] Config used:', {
            webClientId: GOOGLE_WEB_CLIENT_ID,
            iosClientId: GOOGLE_IOS_CLIENT_ID ? 'SET' : 'NOT_SET',
          });
        }
        captureError(new Error('Google Sign In: idToken not received'), {
          location: 'AuthScreen.handleGoogleSignIn.idToken_missing',
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
      if (__DEV__) console.log('[AuthScreen] Calling signInWithIdToken...');
      const { data: sessionData, error: sessionError } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
      });

      if (sessionError) {
        captureError(sessionError, { location: 'AuthScreen.handleGoogleSignIn.signInWithIdToken' });
        Alert.alert(i18n.t('common.error'), i18n.t('errors.auth_failed'));
        return;
      }

      if (sessionData.user) {
        if (__DEV__) console.log('[AuthScreen] SUCCESS - User authenticated via native Google Sign-In');
        // ユーザーレコード作成はonAuthStateChangeで処理される
      }
    } catch (error: unknown) {
      // ユーザーがキャンセルした場合は何もしない
      if (isErrorWithCode(error) && error.code === statusCodes.SIGN_IN_CANCELLED) {
        if (__DEV__) console.log('[AuthScreen] User cancelled Google Sign-In');
        return;
      }
      // Google Play Services が利用不可
      if (isErrorWithCode(error) && error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        Alert.alert(i18n.t('common.error'), i18n.t('errors.google_play_services_unavailable'));
        return;
      }
      captureError(error, { location: 'AuthScreen.handleGoogleSignIn' });
      Alert.alert(i18n.t('common.error'), getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  /**
   * Apple Sign In (ネイティブ認証)
   * expo-apple-authentication を使用してネイティブのApple認証を行い、
   * 取得したIDトークンをSupabaseに渡してセッションを確立
   */
  async function handleAppleSignIn() {
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

    setLoading(true);
    try {
      // Auth画面からのログインであることを識別するフラグを設定
      await AsyncStorage.setItem('loginSource', 'auth_screen');

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

      // Supabaseに IDトークンを渡してセッションを確立
      const { data: sessionData, error: sessionError } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      });

      if (sessionError) {
        captureError(sessionError, { location: 'AuthScreen.handleAppleSignIn.signInWithIdToken' });
        Alert.alert(i18n.t('common.error'), i18n.t('errors.auth_failed'));
        return;
      }

      if (sessionData.user) {
        if (__DEV__) console.log('[AuthScreen] SUCCESS - User authenticated via Apple Sign-In');
        // ユーザーレコード作成はonAuthStateChangeで処理される
      }
    } catch (error: unknown) {
      // ユーザーがキャンセルした場合は何もしない
      const errorCode = (error as { code?: string })?.code;
      if (
        errorCode === 'ERR_REQUEST_CANCELED' ||
        errorCode === 'ERR_CANCELED'
      ) {
        if (__DEV__) console.log('[AuthScreen] User cancelled Apple Sign-In');
        return;
      }
      captureError(error, { location: 'AuthScreen.handleAppleSignIn' });
      Alert.alert(i18n.t('common.error'), getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* 戻るボタン */}
      <View style={styles.backButtonContainer}>
        <TouchableOpacity
          onPress={() => { if (navigation.canGoBack()) navigation.goBack(); }}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel={i18n.t('accessibility.button.back')}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialIcons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>COMMIT</Text>
          <Text style={styles.subtitle}>{i18n.t('auth.subtitle')}</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>{i18n.t('auth.email_label')}</Text>
          <TextInput
            style={styles.input}
            placeholder="email@example.com"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            accessibilityLabel={i18n.t('accessibility.input.email')}
            accessibilityRole="none"
          />

          <Text style={styles.label}>{i18n.t('auth.password_label')}</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            accessibilityLabel={i18n.t('accessibility.input.password')}
            accessibilityRole="none"
          />

          <TouchableOpacity
            style={styles.authButton}
            onPress={handleAuth}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel={isSignUp ? i18n.t('auth.create_account') : i18n.t('auth.login')}
            accessibilityState={{ disabled: loading }}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.authButtonText}>
                {isSignUp ? i18n.t('auth.create_account') : i18n.t('auth.login')}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.switchButton}
            onPress={() => setIsSignUp(!isSignUp)}
            accessibilityRole="button"
            accessibilityLabel={isSignUp ? i18n.t('auth.have_account') : i18n.t('auth.new_user')}
          >
            <Text style={styles.switchButtonText}>
              {isSignUp ? i18n.t('auth.have_account') : i18n.t('auth.new_user')}
            </Text>
          </TouchableOpacity>

          {/* または セパレーター */}
          <View style={styles.separatorContainer}>
            <View style={styles.separatorLine} />
            <Text style={styles.separatorText}>{i18n.t('auth.or')}</Text>
            <View style={styles.separatorLine} />
          </View>

          {/* Google Sign In ボタン */}
          <TouchableOpacity
            style={styles.googleButton}
            onPress={handleGoogleSignIn}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel={i18n.t('auth.google_login')}
            accessibilityState={{ disabled: loading }}
          >
            <MaterialIcons name="login" size={20} color="#4285F4" />
            <Text style={styles.googleButtonText}>{i18n.t('auth.google_login')}</Text>
          </TouchableOpacity>

          {/* Apple Sign In ボタン - iOS のみ */}
          {Platform.OS === 'ios' && (
            <TouchableOpacity
              style={styles.appleButton}
              onPress={handleAppleSignIn}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel={i18n.t('auth.apple_login')}
              accessibilityState={{ disabled: loading }}
            >
              <Ionicons name="logo-apple" size={20} color="#000" />
              <Text style={styles.appleButtonText}>{i18n.t('auth.apple_login')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  backButtonContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  backButton: {
    padding: 8,
    alignSelf: 'flex-start',
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: 4,
    color: '#000',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    letterSpacing: 2,
  },
  form: {
    width: '100%',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 24,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  authButton: {
    backgroundColor: '#000',
    height: 56,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  authButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },
  switchButton: {
    marginTop: 24,
    alignItems: 'center',
  },
  switchButtonText: {
    color: '#666',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  separatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  separatorText: {
    color: '#999',
    fontSize: 14,
    marginHorizontal: 16,
    fontWeight: '500',
  },
  googleButton: {
    backgroundColor: '#fff',
    height: 56,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 12,
  },
  googleButtonText: {
    color: '#4285F4',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  appleButton: {
    backgroundColor: '#fff',
    height: 56,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 12,
  },
  appleButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
