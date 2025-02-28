import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
} from 'react-native';
import supabase from '../../supabase';
import * as Crypto from 'expo-crypto';
import * as LocalAuthentication from 'expo-local-authentication';
import DataUser from '../../navigation/DataUser';

const LoginScreen = ({ navigation }) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    try {
      if (!identifier.trim() || !password.trim()) {
        Alert.alert('Error', 'Please fill in all fields.');
        return;
      }

      // Hash the password for comparison
      const hashedPassword = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        password
      );

      // Query the database directly with both email/phone and hashed password
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .or(`email.eq.${identifier},phone.eq.${identifier}`)
        .eq('password', hashedPassword)
        .single();

      if (error || !user) {
        Alert.alert('Error', 'Invalid credentials. Please try again.');
        return;
      }

      // Store user data in DataUser .js
      DataUser .setUserData(user);

      Alert.alert('Welcome', `Welcome, ${user.fullname}!`);
      navigation.navigate('HomeScreen', { userId: user.id });

    } catch (error) {
      console.error('Authentication error:', error);
      Alert.alert('Error', 'An error occurred while logging in.');
    }
  };

  const handleFingerprintLogin = async () => {
    try {
      // Alert the user about using the same angle
      Alert.alert(
        'Fingerprint Authentication',
        'Please use the same angle and pressure as you did during registration.',
        [{ text: 'OK' }]
      );

      // Check if device has biometric hardware
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      if (!hasHardware) {
        Alert.alert('Error', 'This device does not have biometric hardware');
        return;
      }

      // Check if biometrics are enrolled
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!isEnrolled) {
        Alert.alert('Error', 'No biometrics enrolled on this device');
        return;
      }

      // Try to authenticate with biometrics
      const biometricAuth = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Login with Biometrics',
        disableDeviceFallback: true,
        cancelLabel: 'Cancel'
      });

      if (biometricAuth.success) {
        // Get the fingerprint info
        const fingerprintInfo = {
          timestamp: new Date().toISOString(),
          deviceId: await LocalAuthentication.getEnrolledLevelAsync()
        };

        // Query user with matching fingerprint info
        const { data: user, error } = await supabase
          .from('users')
          .select('*')
          .eq('fingerprintid', JSON.stringify(fingerprintInfo)) // Busca pelo fingerprintid
          .single();

        if (error || !user) {
          Alert.alert('Error', 'No matching account found for this fingerprint');
          return;
        }
        
        // Store user data and navigate
        DataUser .setUserData(user);
        Alert.alert('Success', `Welcome back, ${user.fullname}!`);
        navigation.navigate('HomeScreen', { userId: user.id });

      } else {
        Alert.alert('Error', 'Biometric authentication failed');
      }

    } catch (error) {
      console.error('Biometric error:', error);
      Alert.alert('Error', 'Failed to authenticate with biometrics');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login</Text>

      <TextInput
        style={styles.input}
        placeholder="Email or Phone"
        value={identifier}
        onChangeText={setIdentifier}
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        autoCapitalize="none"
      />

      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>Sign In</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation .navigate('RegisterOne')}>
        <Text style={styles.link}>Don't have an account? Sign Up</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.fingerprintButton} onPress={handleFingerprintLogin}>
        <Image 
          source={{ uri: 'https://img.icons8.com/ios-filled/50/000000/fingerprint.png' }} 
          style={styles.fingerprintIcon} 
        />
        <Text style={styles.fingerprintText}>Biometrics</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center', backgroundColor: '#fff' },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, marginBottom: 10 },
  button: { backgroundColor: '#0d6efd', padding: 15, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16 },
  link: { color: '#0d6efd', textAlign: 'center', marginTop: 10 },
  fingerprintButton: { width: 80, height: 80, backgroundColor: '#f0f0f0', borderRadius: 40, justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginTop: 20 },
  fingerprintIcon: { width: 30, height: 30 },
  fingerprintText: { marginTop: 5, fontSize: 14, color: '#555', textAlign: 'center' },
});

export default LoginScreen;