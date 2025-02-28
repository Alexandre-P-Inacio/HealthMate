import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import supabase from '../../supabase';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Crypto from 'expo-crypto';

const RegisterThree = ({ route, navigation }) => {
  const { fullName, firstName, emailOrPhone, password, identifierType } = route.params;

  const handleFingerprintAuth = async () => {
    try {
      const biometricAuth = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Register Fingerprint',
        disableDeviceFallback: true,
        cancelLabel: 'Cancel'
      });

      if (biometricAuth.success) {
        const { available, biometryType } = await LocalAuthentication.supportedAuthenticationTypesAsync();
        const fingerprintInfo = {
          type: biometryType,
          timestamp: new Date().toISOString(),
          deviceId: await LocalAuthentication.getEnrolledLevelAsync()
        };
        
        handleRegister(JSON.stringify(fingerprintInfo));
      } else {
        Alert.alert('Failed', 'Biometric authentication failed.');
      }
    } catch (error) {
      console.error('Biometric error:', error);
      Alert.alert('Error', 'An error occurred with biometric authentication.');
    }
  };

  const handleRegister = async (fingerprintId = null) => {
    try {
      const hashedPassword = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        password
      );

      const { error } = await supabase.from('users').insert([
        {
          fullname: fullName,
          name: firstName,
          email: identifierType === 'email' ? emailOrPhone : null,
          phone: identifierType === 'phone' ? emailOrPhone : null,
          password: hashedPassword,
          role: 'user',
          fingerprintid: fingerprintId, // Armazena a impressão digital
          pfpimg: null,
        },
      ]);

      if (error) throw error;

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

      <TouchableOpacity style={styles.button} onPress={handleFingerprintAuth}>
        <Text style={styles.buttonText}>Register Fingerprint</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.skipButton} onPress={() => handleRegister()}>
        <Text style={styles.skipButtonText}>Skip</Text>
      </TouchableOpacity>
    </View>
  );
};

// Styles
const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  button: { backgroundColor: '#4A90E2', padding: 15, borderRadius: 8, marginBottom: 20 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  skipButton: { backgroundColor: '#ddd', padding: 15, borderRadius: 8 },
  skipButtonText: { color: '#333', fontSize: 16 },
});

export default RegisterThree;