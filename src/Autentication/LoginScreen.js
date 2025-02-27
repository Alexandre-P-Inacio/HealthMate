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
import DataUser from '../../navigation/DataUser'; // Importando o arquivo DataUser.js

const LoginScreen = ({ navigation }) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    try {
      if (!identifier.trim() || !password.trim()) {
        Alert.alert('Erro', 'Preencha todos os campos.');
        return;
      }

      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .or(`email.eq.${identifier},phone.eq.${identifier}`)
        .single();

      if (error || !user) {
        Alert.alert('Erro', 'Email ou número de telefone incorreto.');
        return;
      }

      const hashedPassword = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        password
      );

      if (hashedPassword !== user.password) {
        Alert.alert('Erro', 'Palavra-passe incorreta.');
        return;
      }

      // Armazenar os dados do usuário no DataUser.js
      DataUser.setUserData(user);

      Alert.alert('Bem-vindo', `Bem-vindo, ${user.fullname}!`);
      navigation.navigate('HomeScreen', { userId: user.id });

    } catch (error) {
      console.error('Erro ao autenticar:', error);
      Alert.alert('Erro', 'Ocorreu um erro ao fazer login.');
    }
  };

  const handleFingerprintLogin = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        Alert.alert('Erro', 'Seu dispositivo não suporta biometria ou não está configurado.');
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Autenticar com impressão digital',
      });

      if (result.success) {
        const { data: users, error } = await supabase
          .from('users')
          .select('*')
          .not('fingerprintid', 'is', null);

        if (error || !users || users.length === 0) {
          Alert.alert('Erro', 'Nenhuma conta encontrada para esta impressão digital.');
          return;
        }

        let matchedUser = null;
        for (const user of users) {
          if (user.fingerprintid) {
            matchedUser = user;
            break;
          }
        }

        if (matchedUser) {
          // Armazenar os dados do usuário no DataUser.js
          DataUser.setUserData(matchedUser);

          Alert.alert('Bem-vindo de volta', `Olá, ${matchedUser.fullname}!`);
          navigation.navigate('HomeScreen', { userId: matchedUser.id });
        } else {
          Alert.alert('Erro', 'Nenhum usuário correspondente encontrado.');
        }
      } else {
        Alert.alert('Erro', 'Falha na autenticação biométrica.');
      }
    } catch (error) {
      console.error('Erro na autenticação biométrica:', error);
      Alert.alert('Erro', 'Ocorreu um erro ao autenticar com biometria.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login</Text>

      <TextInput
        style={styles.input}
        placeholder="Email ou Telefone"
        value={identifier}
        onChangeText={setIdentifier}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>Entrar</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('RegisterOne')}>
        <Text style={styles.link}>Ainda não tem conta? Registe-se</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.fingerprintButton} onPress={handleFingerprintLogin}>
        <Image 
          source={{ uri: 'https://img.icons8.com/ios-filled/50/000000/fingerprint.png' }} 
          style={styles.fingerprintIcon} 
        />
        <Text style={styles.fingerprintText}>Biometria</Text>
      </TouchableOpacity>
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
  title: { 
    fontSize: 28, 
    fontWeight: 'bold', 
    marginBottom: 20, 
    textAlign: 'center' 
  },
  input: { 
    borderWidth: 1, 
    borderColor: '#ddd', 
    borderRadius: 8, 
    padding: 12, 
    marginBottom: 10 
  },
  button: { 
    backgroundColor: '#0d6efd', 
    padding: 15, 
    borderRadius: 8, 
    alignItems: 'center' 
  },
  buttonText: { 
    color: '#fff', 
    fontSize: 16 
  },
  link: { 
    color: '#0d6efd', 
    textAlign: 'center', 
    marginTop: 10 
  },
  fingerprintButton: { 
    width: 80, 
    height: 80, 
    backgroundColor: '#f0f0f0', 
    borderRadius: 40, 
    justifyContent: 'center', 
    alignItems: 'center', 
    alignSelf: 'center', 
    marginTop: 20,
  },
  fingerprintIcon: { 
    width: 30, 
    height: 30, 
  },
  fingerprintText: { 
    marginTop: 5, 
    fontSize: 14, 
    color: '#555', 
    textAlign: 'center'
  },
});

export default LoginScreen;
