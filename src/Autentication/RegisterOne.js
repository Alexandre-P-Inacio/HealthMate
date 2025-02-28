import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import supabase from '../../supabase';

const RegisterOne = ({ navigation }) => {
  const [fullName, setFullName] = useState('');
  const [emailOrPhone, setEmailOrPhone] = useState('');

  const isEmail = (input) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input);
  const isPhoneNumber = (input) => /^\d{9,15}$/.test(input);

  const handleNext = async () => {
    if (!fullName.trim() || !emailOrPhone.trim()) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }

    if (!isEmail(emailOrPhone) && !isPhoneNumber(emailOrPhone)) {
      Alert.alert('Error', 'Please enter a valid email or phone number.');
      return;
    }

    const firstName = fullName.trim().split(' ')[0]; // Get only first name

    try {
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .or(`email.eq.${emailOrPhone},phone.eq.${emailOrPhone}`)
        .maybeSingle();

      if (data) {
        Alert.alert('Error', 'This email or phone number is already registered.');
        return;
      }

      const identifierType = isEmail(emailOrPhone) ? 'email' : 'phone';

      navigation.navigate('RegisterTwo', { fullName, firstName, emailOrPhone, identifierType });
    } catch (error) {
      console.error('Error checking user:', error);
      Alert.alert('Error', 'An error occurred while verifying the data.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Step 1: Enter Your Details</Text>

      <TextInput
        style={styles.input}
        placeholder="Full Name"
        value={fullName}
        onChangeText={setFullName}
      />
      <TextInput
        style={styles.input}
        placeholder="Email or Phone"
        value={emailOrPhone}
        onChangeText={setEmailOrPhone}
      />

      <TouchableOpacity style={styles.button} onPress={handleNext}>
        <Text style={styles.buttonText}>Next</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Login')}>
        <Text style={styles.link}>Already have an account? Log in</Text>
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
});

export default RegisterOne;
