import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import supabase from '../../supabase';
import * as Crypto from 'expo-crypto';
import DataUser from '../../navigation/DataUser';

const WelcomeScreen = ({ navigation }) => {
  const autoLogin = async () => {
    try {
      // Email of the user we want to log in as
      const email = 'inacioprelhaz@gmail.com';
      
      // First, check if the user exists without password check
      const { data: userCheck, error: userCheckError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email);
      
      if (userCheckError) {
        console.error('Error checking user:', userCheckError);
        Alert.alert('Error', 'Failed to check user in database');
        return;
      }
      
      if (!userCheck || userCheck.length === 0) {
        console.error('User not found in database');
        Alert.alert('Error', 'User not found: ' + email);
        return;
      }
      
      // User exists, now attempt to log in with credentials
      // This is the known SHA256 hash of "123456"
      const hashedPassword = '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92';
      
      // Get the user with matching email and password
      const { data: users, error: loginError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .eq('password', hashedPassword);
      
      if (loginError) {
        console.error('Login error:', loginError);
        Alert.alert('Error', 'Database error during login');
        return;
      }
      
      if (!users || users.length === 0) {
        console.error('Invalid credentials');
        Alert.alert('Error', 'Invalid password for user: ' + email);
        return;
      }
      
      const user = users[0];
      
      // Store user data in DataUser
      DataUser.setUserData(user);
      
      // Navigate directly to HomeScreen
      navigation.reset({
        index: 0,
        routes: [{ name: 'HomeScreen', params: { userId: user.id } }],
      });

    } catch (error) {
      console.error('Auto login error:', error);
      Alert.alert('Error', 'Failed to auto login: ' + error.message);
    }
  };
  
  return (
    <View style={styles.container}>
      <Text style={styles.logoText}>Health Mate</Text>

      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('Login')}
      >
        <Text style={styles.buttonText}>Log In</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('RegisterOne')}
      >
        <Text style={styles.buttonText}>Sign Up</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.secondaryButton]}
        onPress={() => navigation.navigate('TableScreen')} // Navegar para a tabela
      >
        <Text style={styles.buttonText}>View Table (Non final)</Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.button, styles.autoLoginButton]}
        onPress={autoLogin}
      >
        <Text style={styles.buttonText}>Auto Login (Alexandre)</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1,justifyContent: 'center',alignItems: 'center',backgroundColor: '#f9f9f9',},
  logoText: {fontSize: 36,fontWeight: 'bold',marginBottom: 40,color: '#0d6efd',},
  button: {backgroundColor: '#0d6efd',padding: 15,borderRadius: 10,marginVertical: 10,width: '80%',alignItems: 'center',},
  secondaryButton: {backgroundColor: '#e0e0e0',},
  autoLoginButton: {backgroundColor: '#28a745',marginTop: 20,},
  buttonText: {color: '#fff',fontSize: 16,},
});

export default WelcomeScreen;
