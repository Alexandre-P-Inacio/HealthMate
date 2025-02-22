import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';

const RegisterTwo = ({ navigation, route }) => {
  const { fullName, firstName, emailOrPhone, identifierType } = route.params;
  const [password, setPassword] = useState('');

  const handleNext = () => {
    if (password.length < 6) {
      Alert.alert('Erro', 'A palavra-passe deve ter pelo menos 6 caracteres.');
      return;
    }

    navigation.navigate('RegisterThree', { fullName, firstName, emailOrPhone, identifierType, password });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Passo 2: Crie uma Palavra-passe</Text>

      <TextInput
        style={styles.input}
        placeholder="Palavra-passe"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity style={styles.button} onPress={handleNext}>
        <Text style={styles.buttonText}>Próximo</Text>
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
});

export default RegisterTwo;
