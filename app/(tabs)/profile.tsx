import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth'; // Assuming useAuth hook exists
import { useRouter } from 'expo-router';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace('/auth'); // Redirect to auth screen after sign out
    } catch (error) {
      console.error("Error signing out:", error);
      Alert.alert("Sign Out Failed", "Could not sign out. Please try again.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Your Profile</Text>
        {user ? (
          <View style={styles.profileInfo}>
            <Text style={styles.label}>Email:</Text>
            <Text style={styles.value}>{user.email}</Text>
            {user.user_metadata?.full_name && (
              <>
                <Text style={styles.label}>Name:</Text>
                <Text style={styles.value}>{user.user_metadata.full_name}</Text>
              </>
            )}
            {/* Add more profile details here */}
            <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
              <Text style={styles.signOutButtonText}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.notLoggedIn}>
            <Text style={styles.description}>You are not logged in.</Text>
            <TouchableOpacity style={styles.loginButton} onPress={() => router.push('/auth')}>
              <Text style={styles.loginButtonText}>Log In / Sign Up</Text>
            </TouchableOpacity>
          </View>
        )}
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
    color: '#FFFFFF',
    marginBottom: 30,
    textAlign: 'center',
  },
  profileInfo: {
    backgroundColor: '#262626', // Surface color from palette
    borderRadius: 16,
    padding: 25,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  label: {
    fontSize: 16,
    color: '#A3A3A3', // Secondary text color from palette
    marginTop: 15,
    marginBottom: 5,
    fontWeight: '600',
  },
  value: {
    fontSize: 20,
    color: '#FFFFFF', // Text color from palette
    marginBottom: 10,
    textAlign: 'center',
  },
  signOutButton: {
    backgroundColor: '#ef4444', // Error color from palette for sign out
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 10,
    marginTop: 30,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
  },
  signOutButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF', // Text color from palette
  },
  notLoggedIn: {
    alignItems: 'center',
  },
  description: {
    fontSize: 18,
    color: '#A3A3A3', // Secondary text color from palette
    textAlign: 'center',
    marginBottom: 20,
  },
  loginButton: {
    backgroundColor: '#9E7FFF', // Primary color from palette
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 10,
    shadowColor: '#9E7FFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
  },
  loginButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF', // Text color from palette
  },
});
