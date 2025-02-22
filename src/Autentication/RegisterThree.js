import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import supabase from '../../supabase';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Crypto from 'expo-crypto';

const RegisterThree = ({ route, navigation }) => {
  const { fullName, firstName, emailOrPhone, password, identifierType } = route.params;

  const handleFingerprintAuth = async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Autenticação por Impressão Digital',
      });

      if (result.success) {
        const fingerprintId = `fingerprint_${emailOrPhone}`;
        handleRegister(fingerprintId);
      } else {
        Alert.alert('Falha', 'Autenticação por impressão digital falhou.');
      }
    } catch (error) {
      console.error('Erro com autenticação biométrica:', error);
      Alert.alert('Erro', 'Ocorreu um erro com a autenticação biométrica.');
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
          fingerprintid: fingerprintId,
        },
      ]);

      if (error) {
        throw error;
      }

      Alert.alert('Sucesso', 'Utilizador registado com sucesso!');
      navigation.navigate('HomeScreen');
    } catch (error) {
      console.error('Erro ao registar utilizador:', error);
      Alert.alert('Erro', 'Falha ao registar utilizador. Por favor, tente novamente.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Passo 3: Autenticação Biométrica</Text>

      <TouchableOpacity style={styles.button} onPress={handleFingerprintAuth}>
        <Text style={styles.buttonText}>Registar Impressão Digital</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.skipButton} onPress={() => handleRegister()}>
        <Text style={styles.skipButtonText}>Pular</Text>
      </TouchableOpacity>
    </View>
  );
};

// Adição dos estilos para evitar o erro
const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5', padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center', color: '#333' },
  button: { backgroundColor: '#4A90E2', paddingVertical: 15, paddingHorizontal: 40, borderRadius: 8, marginBottom: 20 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  skipButton: { backgroundColor: '#ddd', paddingVertical: 15, paddingHorizontal: 40, borderRadius: 8 },
  skipButtonText: { color: '#333', fontSize: 16 },
});

export default RegisterThree;
