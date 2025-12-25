import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, SafeAreaView, Alert, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';
import { MaterialIcons } from '@expo/vector-icons';

export default function AuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  async function handleAuth() {
    if (!email || !password) {
      Alert.alert('エラー', 'メールアドレスとパスワードを入力してください。');
      return;
    }

    setLoading(true);
    if (isSignUp) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) Alert.alert('サインアップエラー', error.message);
      else Alert.alert('成功', '確認メールを送信しました。');
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) Alert.alert('ログインエラー', error.message);
    }
    setLoading(false);
  }

  return (
    <SafeAreaView style={styles.container}>
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
});
