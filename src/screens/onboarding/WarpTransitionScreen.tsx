import React, { useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import WarpSpeedTransition from '../../components/onboarding/WarpSpeedTransition';

export default function WarpTransitionScreen({ navigation, route }: any) {
  const { onComplete } = route.params || {};

  const handleComplete = useCallback(() => {
    if (onComplete) {
      onComplete();
    } else {
      // Default fallback if no callback provided
      navigation.navigate('MainTabs');
    }
  }, [onComplete, navigation]);

  return (
    <View style={styles.container}>
      <WarpSpeedTransition visible={true} onComplete={handleComplete} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
});
