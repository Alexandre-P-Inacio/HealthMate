import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import supabase from '../../supabase';
import * as Crypto from 'expo-crypto';
import * as LocalAuthentication from 'expo-local-authentication';
import DataUser from '../../navigation/DataUser';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LoginScreen = ({ navigation }) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  useEffect(() => {
    checkBiometricAvailability();
  }, []);

  const checkBiometricAvailability = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      setBiometricAvailable(hasHardware && isEnrolled);
    } catch (error) {
      console.error('Error checking biometric availability:', error);
      setBiometricAvailable(false);
    }
  };

  const handleLogin = async () => {
    try {
      setLoading(true);
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

      // Store user data in DataUser
      DataUser.setUserData(user);

      // If biometric is enabled, store the user ID
      if (user.biometric_enabled) {
        await AsyncStorage.setItem('biometricUserId', user.id.toString());
      }

      Alert.alert('Welcome', `Welcome, ${user.fullname}!`);
      navigation.navigate('HomeScreen', { userId: user.id });

    } catch (error) {
      console.error('Authentication error:', error);
      Alert.alert('Error', 'An error occurred while logging in.');
    } finally {
      setLoading(false);
    }
  };

  const handleFingerprintLogin = async () => {
    try {
      setLoading(true);
      
      // Check if hardware and enrollment are available
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        Alert.alert('Error', 'Biometric authentication is not available or not set up on this device.');
        return;
      }

      // Attempt biometric authentication
      const biometricAuth = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Login with Biometrics',
        disableDeviceFallback: true,
        cancelLabel: 'Cancel'
      });

      if (biometricAuth.success) {
        // If authentication succeeds, retrieve the locally stored user ID
        const storedUserId = await AsyncStorage.getItem('biometricUserId');

        if (!storedUserId) {
          Alert.alert('Error', 'No linked account found for biometric login. Please log in with your credentials first.');
          return;
        }

        // Fetch user from database using the stored ID
        const { data: user, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', storedUserId)
          .single();

        if (error || !user) {
          Alert.alert('Error', 'Could not retrieve user information.');
          await AsyncStorage.removeItem('biometricUserId');
          return;
        }

        // Verify that biometric login is enabled for this user
        if (!user.biometric_enabled) {
          Alert.alert('Error', 'Biometric login is not enabled for this account.');
          await AsyncStorage.removeItem('biometricUserId');
          return;
        }

        // Store user data and navigate
        DataUser.setUserData(user);
        Alert.alert('Success', `Welcome back, ${user.fullname}!`);
        navigation.navigate('HomeScreen', { userId: user.id });
      }
    } catch (error) {
      console.error('Biometric error:', error);
      Alert.alert('Error', 'Failed to authenticate with biometrics');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.backButton} 
        onPress={() => navigation.navigate('Welcome')}
      >
        <Ionicons name="arrow-back" size={24} color="#0d6efd" />
      </TouchableOpacity>

      <Text style={styles.title}>Login</Text>

      <TextInput
        style={styles.input}
        placeholder="Email or Phone"
        value={identifier}
        onChangeText={setIdentifier}
        autoCapitalize="none"
        editable={!loading}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        autoCapitalize="none"
        editable={!loading}
      />

      <TouchableOpacity 
        style={[styles.button, loading && styles.buttonDisabled]} 
        onPress={handleLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Sign In</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity 
        onPress={() => navigation.navigate('RegisterOne')}
        disabled={loading}
      >
        <Text style={styles.link}>Don't have an account? Sign Up</Text>
      </TouchableOpacity>

      {biometricAvailable && (
        <TouchableOpacity 
          style={[styles.fingerprintButton, loading && styles.buttonDisabled]} 
          onPress={handleFingerprintLogin}
          disabled={loading}
        >
          <Ionicons name="finger-print" size={32} color="#0d6efd" />
          <Text style={styles.fingerprintText}>Login with Biometrics</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    padding: 20, 
    justifyContent: 'center', 
    backgroundColor: '#fff' 
  },
  backButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    zIndex: 1,
  },
  title: { 
    fontSize: 28, 
    fontWeight: 'bold', 
    marginBottom: 30, 
    textAlign: 'center',
    color: '#333'
  },
  input: { 
    borderWidth: 1, 
    borderColor: '#ddd', 
    borderRadius: 8, 
    padding: 15, 
    marginBottom: 15,
    fontSize: 16,
    backgroundColor: '#f8f9fa'
  },
  button: { 
    backgroundColor: '#0d6efd', 
    padding: 15, 
    borderRadius: 8, 
    alignItems: 'center',
    marginTop: 10
  },
  buttonDisabled: {
    opacity: 0.7
  },
  buttonText: { 
    color: '#fff', 
    fontSize: 16,
    fontWeight: '600'
  },
  link: { 
    color: '#0d6efd', 
    textAlign: 'center', 
    marginTop: 20,
    fontSize: 16
  },
  fingerprintButton: { 
    width: '100%',
    height: 80,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: 30,
    borderWidth: 1,
    borderColor: '#ddd'
  },
  fingerprintText: { 
    marginTop: 8,
    fontSize: 14,
    color: '#666',
    textAlign: 'center'
  }
});

export default LoginScreen;