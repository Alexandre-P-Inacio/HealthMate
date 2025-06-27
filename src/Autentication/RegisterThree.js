import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Alert, 
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import supabase from '../../supabase';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';
import BiometricService from '../services/BiometricService';

const { width } = Dimensions.get('window');

const RegisterThree = ({ route, navigation }) => {
  const { userId } = route.params;
  const { login } = useAuth();
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

  const handleFingerprintAuth = async () => {
    try {
      setLoading(true);

      if (!biometricAvailable) {
        Alert.alert(
          'Biometrics Not Available', 
          'Biometric authentication is not available or not set up on this device. Please set up fingerprints or face ID in your device settings first.'
        );
        return;
      }

      // Attempt biometric authentication
      const biometricAuth = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Setup Biometric Login',
        fallbackLabel: 'Cancel',
        disableDeviceFallback: true,
        cancelLabel: 'Cancel'
      });

      if (biometricAuth.success) {
        // Get user data first
        const { data: user, error: fetchError } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single();

        if (fetchError || !user) {
          throw new Error('Could not retrieve user data');
        }

        // Enable biometric authentication for the user
        const { error: updateError } = await supabase
          .from('users')
          .update({ biometric_enabled: true })
          .eq('id', userId);

        if (updateError) throw updateError;

        // Add user to biometric users list for future biometric logins
        console.log(`🔒 Registering ${user.fullname} for biometric authentication during registration`);
        const biometricSuccess = await BiometricService.addBiometricUser(userId, {
          fullname: user.fullname,
          email: user.email,
          phone: user.phone,
          pfpimg: user.pfpimg
        });

        if (!biometricSuccess) {
          console.error(`❌ Failed to register user for biometric authentication`);
          // Continue anyway, as the database is already updated
        } else {
          console.log(`✅ User successfully registered for biometric authentication`);
        }

        // Login the user using the auth context
        const loginSuccess = await login(user);
        
        if (!loginSuccess) {
          throw new Error('Failed to save login session');
        }

        Alert.alert(
          'Success!', 
          'Biometric login has been enabled and your account has been registered! You can now use fingerprint/face ID to login quickly.',
          [
            { 
              text: 'OK', 
              onPress: () => {
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'HomeScreen' }],
                });
              }
            }
          ]
        );
      } else {
        Alert.alert('Authentication Failed', 'Biometric authentication was cancelled or failed.');
      }
    } catch (error) {
      console.error('Biometric setup error:', error);
      Alert.alert('Error', 'Failed to setup biometric authentication. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    try {
      setLoading(true);

      // Get user data and login without enabling biometrics
      const { data: user, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (fetchError || !user) {
        throw new Error('Could not retrieve user data');
      }

      // Login the user using the auth context
      const loginSuccess = await login(user);
      
      if (!loginSuccess) {
        throw new Error('Failed to save login session');
      }

      Alert.alert(
        'Registration Complete!', 
        'You can enable biometric login later in your account settings.',
        [
          { 
            text: 'OK', 
            onPress: () => {
              navigation.reset({
                index: 0,
                routes: [{ name: 'HomeScreen' }],
              });
            }
          }
        ]
      );
    } catch (error) {
      console.error('Registration completion error:', error);
      Alert.alert('Error', 'Failed to complete registration. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
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
          <Text style={styles.title}>Setup Biometric Login</Text>
          <Text style={styles.subtitle}>
            Enable fingerprint or face recognition for faster and more secure access to your account
          </Text>
        </View>

        <View style={styles.formContainer}>
          {biometricAvailable ? (
            <>
              <TouchableOpacity 
                style={[styles.biometricButton, loading && styles.buttonDisabled]} 
                onPress={handleFingerprintAuth}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="finger-print" size={32} color="#fff" />
                    <Text style={styles.biometricButtonText}>Enable Biometric Login</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.skipButton, loading && styles.buttonDisabled]} 
                onPress={handleSkip}
                disabled={loading}
              >
                <Text style={styles.skipButtonText}>Skip for Now</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.warningContainer}>
                <Ionicons name="warning-outline" size={48} color="#ff9800" />
                <Text style={styles.warningText}>
                  Biometric authentication is not available on this device or not set up.
                </Text>
                <Text style={styles.warningSubtext}>
                  You can set it up later in your device settings and then enable it in your account.
                </Text>
              </View>

              <TouchableOpacity 
                style={[styles.skipButton, loading && styles.buttonDisabled]} 
                onPress={handleSkip}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#666" />
                ) : (
                  <Text style={styles.skipButtonText}>Continue</Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#fff'
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
    width: width * 0.3,
    height: width * 0.3,
    marginBottom: 20,
  },
  title: { 
    fontSize: 28, 
    fontWeight: 'bold', 
    marginBottom: 10, 
    textAlign: 'center',
    color: '#333'
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  formContainer: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  biometricButton: { 
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a237e', 
    padding: 15, 
    borderRadius: 12, 
    marginBottom: 20,
    width: '100%',
    shadowColor: '#1a237e',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  biometricButtonText: { 
    color: '#fff', 
    fontSize: 16, 
    fontWeight: '600',
    marginLeft: 10,
  },
  skipButton: { 
    backgroundColor: '#f5f5f5', 
    padding: 15, 
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  skipButtonText: { 
    color: '#666', 
    fontSize: 16,
    fontWeight: '500',
  },
  warningContainer: {
    alignItems: 'center',
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  warningText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginTop: 15,
    fontWeight: '500',
  },
  warningSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 20,
  },
});

export default RegisterThree;