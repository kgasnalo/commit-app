import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { MaterialIcons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { getErrorMessage } from '../utils/errorUtils';
import i18n from '../i18n';

// WebBrowserの結果を適切に処理するために必要
WebBrowser.maybeCompleteAuthSession();

export default function AuthScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  // リダイレクトURIの設定
  const redirectUri = makeRedirectUri({
    scheme: 'commitapp',
    path: 'auth/callback',
  });

  async function handleAuth() {
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
          .single();

        // レコードが存在しない場合は作成（既存ユーザー対応）
        if (!userData && !checkError && data.user.email) {
          await supabase
            .from('users')
            .insert({
              id: data.user.id,
              email: data.user.email,
              subscription_status: 'inactive'
            });
        }
      }
    }
    setLoading(false);
  }

  // Helper: Ensure user record exists in users table
  const ensureUserRecord = async (userId: string, userEmail: string | undefined) => {
    if (!userEmail) return;

    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single();

    if (!userData) {
      await supabase
        .from('users')
        .insert({
          id: userId,
          email: userEmail,
          subscription_status: 'inactive'
        });
    }
  };

  // Google Sign In
  async function handleGoogleSignIn() {
    try {
      setLoading(true);
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
        Alert.alert(i18n.t('auth.error_google'), error.message);
        return;
      }

      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectUri
        );

        if (result.type === 'success') {
          const url = result.url;
          const urlObj = new URL(url);
          const hashParams = new URLSearchParams(urlObj.hash.slice(1));
          const queryParams = urlObj.searchParams;

          // PKCE Flow: codeパラメータをチェック（優先）
          const code = queryParams.get('code');
          if (code) {
            const { data: sessionData, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);

            if (sessionError) {
              Alert.alert(i18n.t('auth.error_auth'), sessionError.message);
              return;
            }

            if (sessionData.user) {
              await ensureUserRecord(sessionData.user.id, sessionData.user.email);
            }
            return;
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
              Alert.alert(i18n.t('auth.error_auth'), sessionError.message);
              return;
            }

            if (sessionData.user) {
              await ensureUserRecord(sessionData.user.id, sessionData.user.email);
            }
          }
        }
      }
    } catch (error: unknown) {
      Alert.alert(i18n.t('common.error'), getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* 戻るボタン */}
      <View style={styles.backButtonContainer}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
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
          />

          <Text style={styles.label}>{i18n.t('auth.password_label')}</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity 
            style={styles.authButton} 
            onPress={handleAuth}
            disabled={loading}
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
