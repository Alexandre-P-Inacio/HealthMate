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
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import supabase from '../../supabase';
import * as Crypto from 'expo-crypto';
import * as LocalAuthentication from 'expo-local-authentication';
import DataUser from '../../navigation/DataUser';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

const LoginScreen = ({ navigation }) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));

  useEffect(() => {
    checkBiometricAvailability();
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 1000,
        useNativeDriver: true,
      }),
    ]).start();
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

      const hashedPassword = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        password
      );

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

      // Ensure user.id is an integer or null before setting it globally
      const userIdToSet = !isNaN(parseInt(user.id)) ? parseInt(user.id) : null;
      DataUser.setUserData({ ...user, id: userIdToSet });

      if (user.biometric_enabled) {
        await AsyncStorage.setItem('biometricUserId', userIdToSet.toString());
      }

      if (user.role === 'medic') {
        const { data: doctorData, error: doctorError } = await supabase
          .from('doctors')
          .select('*')
          .eq('id', userIdToSet)
          .single();

        if (doctorError && doctorError.code !== 'PGRST116') {
          console.error('Error checking doctor status:', doctorError);
          Alert.alert('Error', 'An error occurred while checking user role.');
          return;
        }

        if (doctorData) {
          navigation.navigate('DoctorDashboard');
        } else {
          navigation.navigate('DoctorRegistration');
        }
      } else {
        navigation.navigate('HomeScreen', { userId: userIdToSet });
      }
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
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        Alert.alert('Error', 'Biometric authentication is not available.');
        return;
      }

      const biometricAuth = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Login with Biometrics',
        disableDeviceFallback: true,
        cancelLabel: 'Cancel'
      });

      if (biometricAuth.success) {
        const storedUserId = await AsyncStorage.getItem('biometricUserId');

        if (!storedUserId) {
          Alert.alert('Error', 'No linked account found for biometric login.');
          return;
        }

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

        if (!user.biometric_enabled) {
          Alert.alert('Error', 'Biometric login is not enabled for this account.');
          await AsyncStorage.removeItem('biometricUserId');
          return;
        }

        // Ensure user.id is an integer or null before setting it globally
        const bioUserIdToSet = !isNaN(parseInt(user.id)) ? parseInt(user.id) : null;
        DataUser.setUserData({ ...user, id: bioUserIdToSet });

        if (user.role === 'medic') {
          const { data: doctorData, error: doctorError } = await supabase
            .from('doctors')
            .select('*')
            .eq('id', bioUserIdToSet)
            .single();

          if (doctorError && doctorError.code !== 'PGRST116') {
            console.error('Error checking doctor status:', doctorError);
            Alert.alert('Error', 'An error occurred while checking user role.');
            return;
          }

          if (doctorData) {
            navigation.navigate('DoctorDashboard');
          } else {
            navigation.navigate('DoctorRegistration');
          }
        } else {
          navigation.navigate('HomeScreen', { userId: bioUserIdToSet });
        }
      }
    } catch (error) {
      console.error('Biometric error:', error);
      Alert.alert('Error', 'Failed to authenticate with biometrics');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.navigate('Welcome')}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      <Animated.View 
        style={[
          styles.contentContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <View style={styles.logoContainer}>
          <Image
            source={require('../../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>Welcome Back!</Text>
          <Text style={styles.subtitle}>Sign in to continue</Text>
        </View>

        <View style={styles.formContainer}>
          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email or Phone"
              placeholderTextColor="#999"
              value={identifier}
              onChangeText={setIdentifier}
              autoCapitalize="none"
              editable={!loading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#999"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              autoCapitalize="none"
              editable={!loading}
            />
          </View>

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
            style={styles.registerLink}
          >
            <Text style={styles.registerText}>Don't have an account? </Text>
            <Text style={styles.registerTextBold}>Sign Up</Text>
          </TouchableOpacity>

          {biometricAvailable && (
            <TouchableOpacity 
              style={[styles.fingerprintButton, loading && styles.buttonDisabled]} 
              onPress={handleFingerprintLogin}
              disabled={loading}
            >
              <Ionicons name="finger-print" size={32} color="#fff" />
              <Text style={styles.fingerprintText}>Login with Biometrics</Text>
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: width * 0.4,
    height: width * 0.4,
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  formContainer: {
    width: '100%',
    maxWidth: 400,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    marginBottom: 15,
    paddingHorizontal: 15,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: '#333',
  },
  button: {
    backgroundColor: '#1a237e',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#1a237e',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  registerLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  registerText: {
    color: '#666',
    fontSize: 16,
  },
  registerTextBold: {
    color: '#1a237e',
    fontSize: 16,
    fontWeight: 'bold',
  },
  fingerprintButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a237e',
    padding: 15,
    borderRadius: 12,
    marginTop: 20,
    shadowColor: '#1a237e',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  fingerprintText: {
    color: '#fff',
    marginLeft: 10,
    fontSize: 16,
  },
});

export default LoginScreen;