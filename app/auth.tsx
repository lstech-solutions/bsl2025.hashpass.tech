import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

export default function AuthScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Welcome to HashPass</Text>
        <Text style={styles.description}>Sign in or create an account to manage your digital life.</Text>
        <TouchableOpacity style={styles.button} onPress={() => { Alert.alert("Sign In", "Sign In functionality coming soon!"); router.replace('/(tabs)/home'); }}>
          <Text style={styles.buttonText}>Sign In</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.signUpButton]} onPress={() => { Alert.alert("Sign Up", "Sign Up functionality coming soon!"); router.replace('/(tabs)/home'); }}>
          <Text style={styles.buttonText}>Sign Up</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#171717', // Background color from palette
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF', // Text color from palette
    marginBottom: 20,
    textAlign: 'center',
  },
  description: {
    fontSize: 18,
    color: '#A3A3A3', // Secondary text color from palette
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 26,
  },
  button: {
    backgroundColor: '#9E7FFF', // Primary color from palette
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 12,
    marginBottom: 20,
    width: '80%',
    maxWidth: 300,
    alignItems: 'center',
    shadowColor: '#9E7FFF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  signUpButton: {
    backgroundColor: '#f472b6', // Accent color from palette
    shadowColor: '#f472b6',
  },
  buttonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF', // Text color from palette
  },
});
