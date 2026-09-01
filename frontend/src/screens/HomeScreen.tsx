import React from 'react';
import { View, Button, StyleSheet, SafeAreaView } from 'react-native';

export default function HomeScreen({ navigation }: any) {
  const handleRegisterWish = () => {
    console.log('Registrar desejo clicado');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.topButtonContainer}>
          <Button title="registrar desejo" onPress={handleRegisterWish} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    padding: 16,
  },
  topButtonContainer: {
    width: '100%',
    marginBottom: 20,
  },
});
