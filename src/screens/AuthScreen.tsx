import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseInitialized } from '../lib/supabase';
import { ENV_INIT_ERROR, SUPABASE_URL, SUPABASE_ANON_KEY, GOOGLE_WEB_CLIENT_ID, GOOGLE_IOS_CLIENT_ID } from '../config/env';
import { MaterialIcons } from '@expo/vector-icons';
import { GoogleSignin, statusCodes, isErrorWithCode } from '@react-native-google-signin/google-signin';
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
    // デバッグログ: 環境変数の状態を確認
    console.log('[AuthScreen] Google Sign-In config check:', {
      webClientId: GOOGLE_WEB_CLIENT_ID ? 'SET' : 'UNDEFINED',
      iosClientId: GOOGLE_IOS_CLIENT_ID ? 'SET' : 'UNDEFINED',
      webClientIdLength: GOOGLE_WEB_CLIENT_ID?.length ?? 0,
      iosClientIdLength: GOOGLE_IOS_CLIENT_ID?.length ?? 0,
    });

    if (GOOGLE_WEB_CLIENT_ID) {
      GoogleSignin.configure({
        webClientId: GOOGLE_WEB_CLIENT_ID,
        iosClientId: GOOGLE_IOS_CLIENT_ID,
        offlineAccess: true,
      });
      console.log('[AuthScreen] GoogleSignin.configure() called successfully');
    } else {
      console.warn('[AuthScreen] GoogleSignin NOT configured - GOOGLE_WEB_CLIENT_ID is undefined');
    }
  }, []);

  async function handleAuth() {
    // Supabase初期化チェック
    if (!isSupabaseInitialized()) {
      Alert.alert(
        i18n.t('common.error'),
        `${i18n.t('errors.service_unavailable')}\n\n[Debug] ${getSupabaseErrorDetail()}`
      );
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
        Alert.alert(i18n.t('auth.error_signup'), error.message);
      } else if (data.user && data.user.email) {
        // usersテーブルにレコードを作成
        const { error: insertError } = await supabase
          .from('users')
          .insert({
            id: data.user.id,
            email: data.user.email,
            username: 'user_' + data.user.id.substring(0, 8),
            subscription_status: 'inactive'
          });

        if (insertError) {
          console.error('Failed to create user record:', insertError);
        }
        Alert.alert(i18n.t('common.success'), i18n.t('auth.success_email_sent'));
      }
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        Alert.alert(i18n.t('auth.error_login'), error.message);
      } else if (data.user) {
        // ログイン時にusersテーブルのレコードが存在するか確認
        const { data: userData, error: checkError } = await supabase
          .from('users')
          .select('id')
          .eq('id', data.user.id)
          .maybeSingle();

        // レコードが存在しない場合は作成（既存ユーザー対応）
        if (!userData && !checkError && data.user.email) {
          await supabase
            .from('users')
            .insert({
              id: data.user.id,
              email: data.user.email,
              username: 'user_' + data.user.id.substring(0, 8),
              subscription_status: 'inactive'
            });
        }
      }
    }
    setLoading(false);
  }

  // Helper: Ensure user record exists in users table
  const ensureUserRecord = async (userId: string, userEmail: string | undefined) => {
    if (!isSupabaseInitialized()) return;
    if (!userEmail) return;

    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (!userData) {
      await supabase
        .from('users')
        .insert({
          id: userId,
          email: userEmail,
          username: 'user_' + userId.substring(0, 8),
          subscription_status: 'inactive'
        });
    }
  };

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
      Alert.alert(
        i18n.t('common.error'),
        `${i18n.t('errors.service_unavailable')}\n\n[Debug] ${getSupabaseErrorDetail()}`
      );
      return;
    }

    // Google Web Client ID チェック
    if (!GOOGLE_WEB_CLIENT_ID) {
      Alert.alert(
        i18n.t('common.error'),
        'Google Sign-In is not configured. Missing GOOGLE_WEB_CLIENT_ID.'
      );
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
      if (__DEV__) console.log('[AuthScreen] GoogleSignin.signIn result:', { hasIdToken: !!signInResult.data?.idToken });

      // idTokenが取得できなかった場合はエラー
      const idToken = signInResult.data?.idToken;
      if (!idToken) {
        throw new Error('Google Sign In: idToken not received');
      }

      // Supabaseに IDトークンを渡してセッションを確立
      if (__DEV__) console.log('[AuthScreen] Calling signInWithIdToken...');
      const { data: sessionData, error: sessionError } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
      });

      if (sessionError) {
        captureError(sessionError, { location: 'AuthScreen.handleGoogleSignIn.signInWithIdToken' });
        Alert.alert(i18n.t('common.error'), sessionError.message);
        return;
      }

      if (sessionData.user) {
        if (__DEV__) console.log('[AuthScreen] SUCCESS - User authenticated via native Google Sign-In');
        // ユーザーレコード作成はonAuthStateChangeで処理されるため、ここでは不要
        await ensureUserRecord(sessionData.user.id, sessionData.user.email);
      }
    } catch (error: unknown) {
      // ユーザーがキャンセルした場合は何もしない
      if (isErrorWithCode(error) && error.code === statusCodes.SIGN_IN_CANCELLED) {
        if (__DEV__) console.log('[AuthScreen] User cancelled Google Sign-In');
        return;
      }
      // Google Play Services が利用不可
      if (isErrorWithCode(error) && error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        Alert.alert(i18n.t('common.error'), 'Google Play Services is not available');
        return;
      }
      captureError(error, { location: 'AuthScreen.handleGoogleSignIn' });
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
          onPress={() => navigation.goBack()}
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
});
