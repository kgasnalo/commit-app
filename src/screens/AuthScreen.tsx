import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { MaterialIcons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { getErrorMessage } from '../utils/errorUtils';

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
      Alert.alert('エラー', 'メールアドレスとパスワードを入力してください。');
      return;
    }

    setLoading(true);
    if (isSignUp) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        Alert.alert('サインアップエラー', error.message);
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
        Alert.alert('成功', '確認メールを送信しました。');
      }
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        Alert.alert('ログインエラー', error.message);
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

  // Google Sign In
  async function handleGoogleSignIn() {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUri,
          skipBrowserRedirect: false,
        },
      });

      if (error) {
        Alert.alert('Google Sign Inエラー', error.message);
        return;
      }

      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectUri
        );

        if (result.type === 'success') {
          const url = result.url;
          // URLからアクセストークンとリフレッシュトークンを抽出
          const params = new URLSearchParams(url.split('#')[1] || url.split('?')[1]);
          const access_token = params.get('access_token');
          const refresh_token = params.get('refresh_token');

          if (access_token && refresh_token) {
            const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
              access_token,
              refresh_token,
            });

            if (sessionError) {
              Alert.alert('認証エラー', sessionError.message);
            } else if (sessionData.user) {
              // usersテーブルにレコードが存在するか確認
              const { data: userData, error: checkError } = await supabase
                .from('users')
                .select('id')
                .eq('id', sessionData.user.id)
                .single();

              // レコードが存在しない場合は作成
              if (!userData && !checkError && sessionData.user.email) {
                await supabase
                  .from('users')
                  .insert({
                    id: sessionData.user.id,
                    email: sessionData.user.email,
                    subscription_status: 'inactive'
                  });
              }
            }
          }
        }
      }
    } catch (error: unknown) {
      Alert.alert('エラー', getErrorMessage(error));
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
          <Text style={styles.subtitle}>規律を資産に変える</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>メールアドレス</Text>
          <TextInput
            style={styles.input}
            placeholder="email@example.com"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <Text style={styles.label}>パスワード</Text>
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
                {isSignUp ? 'アカウント作成' : 'ログイン'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.switchButton}
            onPress={() => setIsSignUp(!isSignUp)}
          >
            <Text style={styles.switchButtonText}>
              {isSignUp ? '既にアカウントをお持ちの方はこちら' : '新規登録はこちら'}
            </Text>
          </TouchableOpacity>

          {/* または セパレーター */}
          <View style={styles.separatorContainer}>
            <View style={styles.separatorLine} />
            <Text style={styles.separatorText}>または</Text>
            <View style={styles.separatorLine} />
          </View>

          {/* Google Sign In ボタン */}
          <TouchableOpacity
            style={styles.googleButton}
            onPress={handleGoogleSignIn}
            disabled={loading}
          >
            <MaterialIcons name="login" size={20} color="#4285F4" />
            <Text style={styles.googleButtonText}>Googleでログイン</Text>
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
