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
      Alert.alert('Erro', 'Preencha todos os campos.');
      return;
    }

    if (!isEmail(emailOrPhone) && !isPhoneNumber(emailOrPhone)) {
      Alert.alert('Erro', 'Introduza um email ou número de telefone válido.');
      return;
    }

    const firstName = fullName.trim().split(' ')[0]; // Pega apenas o primeiro nome

    try {
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .or(`email.eq.${emailOrPhone},phone.eq.${emailOrPhone}`)
        .maybeSingle();

      if (data) {
        Alert.alert('Erro', 'Este email ou número de telefone já está registado.');
        return;
      }

      const identifierType = isEmail(emailOrPhone) ? 'email' : 'phone';

      navigation.navigate('RegisterTwo', { fullName, firstName, emailOrPhone, identifierType });
    } catch (error) {
      console.error('Erro ao verificar utilizador:', error);
      Alert.alert('Erro', 'Ocorreu um erro ao verificar os dados.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Passo 1: Introduza os seus dados</Text>

      <TextInput
        style={styles.input}
        placeholder="Nome Completo"
        value={fullName}
        onChangeText={setFullName}
      />
      <TextInput
        style={styles.input}
        placeholder="Email ou Telefone"
        value={emailOrPhone}
        onChangeText={setEmailOrPhone}
      />

      <TouchableOpacity style={styles.button} onPress={handleNext}>
        <Text style={styles.buttonText}>Próximo</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Login')}>
        <Text style={styles.link}>Já tem conta? Entrar</Text>
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
