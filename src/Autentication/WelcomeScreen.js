import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import supabase from '../../supabase';
import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DataUser from '../../navigation/DataUser';
import { useAuth } from '../contexts/AuthContext';

const { width } = Dimensions.get('window');

const WelcomeScreen = ({ navigation }) => {
  const { login, syncAuthState } = useAuth();
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));

  useEffect(() => {
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

  const autoLogin = async () => {
    try {
      const email = 'inacioprelhaz@gmail.com';
      const password = 'Bunda2005#';
      const hashedPassword = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        password
      );

      const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .eq('password', hashedPassword);

      if (error) {
        console.error('Login error:', error);
        return;
      }

      if (!users || users.length === 0) {
        console.error('User not found');
        return;
      }

      const user = users[0];
      const userIdToSet = !isNaN(parseInt(user.id)) ? parseInt(user.id) : null;
      const userData = { ...user, id: userIdToSet };
      
      // Usar a função login do AuthContext para garantir sincronização
      const loginSuccess = await login(userData);
      
      if (loginSuccess) {
        console.log('🚀 Quick Login 1 realizado com sucesso');
        
        if (user.role === 'medic') {
          const { data: doctorData, error: doctorError } = await supabase
            .from('doctors')
            .select('*')
            .eq('id', userIdToSet)
            .single();

          if (doctorError && doctorError.code !== 'PGRST116') {
            console.error('Error checking doctor status:', doctorError);
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
      } else {
        console.error('Falha no quick login 1');
      }
    } catch (error) {
      console.error('Auto login error:', error);
    }
  };

  const autoLogin2 = async () => {
    try {
      const phone = '915000063';
      const password = 'Bunda2005#';
      const hashedPassword = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        password
      );

      const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .eq('phone', phone)
        .eq('password', hashedPassword);

      if (error) {
        console.error('Login error:', error);
        return;
      }

      if (!users || users.length === 0) {
        console.error('User not found');
        return;
      }

      const user = users[0];
      const userIdToSet = !isNaN(parseInt(user.id)) ? parseInt(user.id) : null;
      const userData = { ...user, id: userIdToSet };
      
      // Usar a função login do AuthContext para garantir sincronização
      const loginSuccess = await login(userData);
      
      if (loginSuccess) {
        console.log('🚀 Quick Login 2 realizado com sucesso');
        
        if (user.role === 'medic') {
          const { data: doctorData, error: doctorError } = await supabase
            .from('doctors')
            .select('*')
            .eq('id', userIdToSet)
            .single();

          if (doctorError && doctorError.code !== 'PGRST116') {
            console.error('Error checking doctor status:', doctorError);
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
      } else {
        console.error('Falha no quick login 2');
      }
    } catch (error) {
      console.error('Auto login error:', error);
    }
  };

  return (
    <View style={styles.container}>
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
          <Text style={styles.title}>Welcome to HealthMate</Text>
          <Text style={styles.subtitle}>Your Health, Our Priority</Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.primaryButton}
            onPress={() => navigation.navigate('Login')}
          >
            <Ionicons name="log-in-outline" size={24} color="#fff" style={styles.buttonIcon} />
            <Text style={styles.primaryButtonText}>Log In</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.secondaryButton}
            onPress={() => navigation.navigate('RegisterOne')}
          >
            <Ionicons name="person-add-outline" size={24} color="#1a237e" style={styles.buttonIcon} />
            <Text style={styles.secondaryButtonText}>Sign Up</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.tertiaryButton}
            onPress={autoLogin}
          >
            <Ionicons name="flash-outline" size={24} color="#1a237e" style={styles.buttonIcon} />
            <Text style={styles.tertiaryButtonText}>Quick Login 1</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.tertiaryButton}
            onPress={autoLogin2}
          >
            <Ionicons name="flash-outline" size={24} color="#1a237e" style={styles.buttonIcon} />
            <Text style={styles.tertiaryButtonText}>Quick Login 2</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
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
  buttonContainer: {
    width: '100%',
    maxWidth: 400,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a237e',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: '#1a237e',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#1a237e',
  },
  tertiaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1a237e',
  },
  buttonIcon: {
    marginRight: 10,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#1a237e',
    fontSize: 18,
    fontWeight: '600',
  },
  tertiaryButtonText: {
    color: '#1a237e',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default WelcomeScreen;
