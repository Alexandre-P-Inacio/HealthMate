import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import supabase from '../../supabase';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';

const RegisterThree = ({ route, navigation }) => {
  const { fullName, firstName, emailOrPhone, password, identifierType } = route.params;

  const handleFingerprintAuth = async () => {
    try {
      // First check if hardware and enrollment are available
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware) {
        Alert.alert('Error', 'Biometric authentication is not available on this device.');
        return;
      }
      if (!isEnrolled) {
        Alert.alert('Error', 'No biometrics are enrolled on this device. Please set up fingerprints or face ID in your device settings.');
        return;
      }

      // Then attempt biometric authentication
      const biometricAuth = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Enable Biometric Login',
        disableDeviceFallback: true,
        cancelLabel: 'Cancel'
      });

      if (biometricAuth.success) {
        // If authentication succeeds, register the user with biometric_enabled = true
        const hashedPassword = await Crypto.digestStringAsync(
          Crypto.CryptoDigestAlgorithm.SHA256,
          password
        );

        const { data: newUser, error } = await supabase.from('users').insert([
          {
            fullname: fullName,
            name: firstName,
            email: identifierType === 'email' ? emailOrPhone : null,
            phone: identifierType === 'phone' ? emailOrPhone : null,
            password: hashedPassword,
            role: 'user',
            biometric_enabled: true,
            pfpimg: null,
          },
        ]).select().single();

        if (error) throw error;

        // Store the user ID in AsyncStorage for biometric login
        await AsyncStorage.setItem('biometricUserId', newUser.id.toString());

        Alert.alert('Success', 'Registration complete! Please login.', [
          { text: 'OK', onPress: () => navigation.navigate('Login') },
        ]);
      } else {
        Alert.alert('Failed', 'Biometric authentication failed or was cancelled.');
      }
    } catch (error) {
      console.error('Registration error:', error);
      Alert.alert('Error', 'Failed to register. Please try again.');
    }
  };

  const handleRegister = async (biometricEnabled = false) => {
    try {
      const hashedPassword = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        password
      );

      const { data: newUser, error } = await supabase.from('users').insert([
        {
          fullname: fullName,
          name: firstName,
          email: identifierType === 'email' ? emailOrPhone : null,
          phone: identifierType === 'phone' ? emailOrPhone : null,
          password: hashedPassword,
          role: 'user',
          biometric_enabled: biometricEnabled,
          pfpimg: null,
        },
      ]).select().single();

      if (error) throw error;

      // If biometric is enabled, store the user ID
      if (biometricEnabled) {
        await AsyncStorage.setItem('biometricUserId', newUser.id.toString());
      }

      Alert.alert('Success', 'Registration complete! Please login.', [
        { text: 'OK', onPress: () => navigation.navigate('Login') },
      ]);
    } catch (error) {
      console.error('Registration error:', error);
      Alert.alert('Error', 'Failed to register. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Step 3: Biometrics</Text>
      <Text style={styles.subtitle}>Enable biometric login for faster access</Text>

      <TouchableOpacity style={styles.button} onPress={handleFingerprintAuth}>
        <Text style={styles.buttonText}>Enable Biometric Login</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.skipButton} onPress={() => handleRegister(false)}>
        <Text style={styles.skipButtonText}>Skip</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 20,
    backgroundColor: '#fff'
  },
  title: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    marginBottom: 10, 
    textAlign: 'center',
    color: '#333'
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center'
  },
  button: { 
    backgroundColor: '#4A90E2', 
    padding: 15, 
    borderRadius: 8, 
    marginBottom: 20,
    width: '80%',
    alignItems: 'center'
  },
  buttonText: { 
    color: '#fff', 
    fontSize: 16, 
    fontWeight: 'bold' 
  },
  skipButton: { 
    backgroundColor: '#f0f0f0', 
    padding: 15, 
    borderRadius: 8,
    width: '80%',
    alignItems: 'center'
  },
  skipButtonText: { 
    color: '#666', 
    fontSize: 16 
  },
});

export default RegisterThree;