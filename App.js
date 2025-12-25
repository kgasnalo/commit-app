import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import RoleSelectScreen from './src/screens/RoleSelectScreen';

export default function App() {
  return (
    <View style={styles.container}>
      <RoleSelectScreen />
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});
