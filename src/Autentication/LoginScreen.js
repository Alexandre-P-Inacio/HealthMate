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

const LoginScreen = ({ navigation }) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    try {
      if (!identifier.trim() || !password.trim()) {
        Alert.alert('Erro', 'Preencha todos os campos.');
        return;
      }

      // Buscar utilizador pelo email ou telefone
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .or(`email.eq.${identifier},phone.eq.${identifier}`)
        .maybeSingle(); // Evita erro caso não encontre utilizador

      if (error || !user) {
        Alert.alert('Erro', 'Email ou número de telefone incorreto.');
        return;
      }

      // Hash da palavra-passe inserida pelo utilizador
      const hashedPassword = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        password
      );

      if (hashedPassword !== user.password) {
        Alert.alert('Erro', 'Palavra-passe incorreta.');
        return;
      }

      Alert.alert('Bem-vindo', `Bem-vindo, ${user.fullname}!`);
      navigation.navigate('HomeScreen', { userId: user.id });

    } catch (error) {
      console.error('Erro ao autenticar:', error);
      Alert.alert('Erro', 'Ocorreu um erro ao fazer login.');
    }
  };

  const handleFingerprintLogin = async () => {
    try {
      // Verificar se o dispositivo suporta biometria
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      if (!hasHardware) {
        Alert.alert('Erro', 'O seu dispositivo não suporta autenticação biométrica.');
        return;
      }
  
      // Verificar se o utilizador tem biometria configurada
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!isEnrolled) {
        Alert.alert('Erro', 'Nenhuma biometria encontrada. Configure no dispositivo.');
        return;
      }
  
      // Pedir autenticação biométrica ao utilizador
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Autenticar com impressão digital',
        cancelLabel: 'Cancelar',
        disableDeviceFallback: true,
      });
  
      if (result.success) {
        // Buscar qualquer utilizador que tenha um fingerprintId associado
        const { data: user, error } = await supabase
          .from('users')
          .select('*')
          .neq('fingerprintid', null) // Procura qualquer utilizador com fingerprint associada
          .maybeSingle();
  
        if (error || !user || !user.fingerprintid) {
          Alert.alert('Erro', 'Nenhuma conta encontrada para esta impressão digital.');
          return;
        }
  
        Alert.alert('Bem-vindo de volta', `Olá, ${user.fullname}!`);
        navigation.navigate('HomeScreen', { userId: user.id });
  
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

      <View style={styles.fingerprintContainer}>
        <TouchableOpacity
          style={styles.fingerprintButton}
          onPress={handleFingerprintLogin}
        >
          <Image
            source={{
              uri: 'https://img.icons8.com/ios-filled/50/000000/fingerprint.png',
            }}
            style={styles.fingerprintIcon}
          />
        </TouchableOpacity>
        <Text style={styles.fingerprintText}>Entrar com biometria</Text>
      </View>
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
  fingerprintContainer: { alignItems: 'center', marginTop: 20 },
  fingerprintButton: { width: 60, height: 60, backgroundColor: '#f0f0f0', borderRadius: 30, justifyContent: 'center', alignItems: 'center' },
  fingerprintIcon: { width: 30, height: 30 },
  fingerprintText: { marginTop: 10, fontSize: 14, color: '#555' },
});

export default LoginScreen;
