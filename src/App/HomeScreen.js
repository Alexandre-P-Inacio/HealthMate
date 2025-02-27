import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import DataUser from '../../navigation/DataUser'; // Importando o arquivo DataUser.js
import Navbar from '../Components/Navbar';

const HomeScreen = () => {
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    // Tentar buscar os dados do usuário diretamente do DataUser.js
    const user = DataUser.getUserData();

    if (user) {
      setUserData(user);
    } else {
      Alert.alert('Erro', 'Nenhum usuário encontrado.');
    }
  }, []);

  if (!userData) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>A carregar dados do utilizador...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Bem-vindo, {userData.fullname}!</Text>
        <Text>ID: {userData.id}</Text>
        <Text>Email: {userData.email || 'N/A'}</Text>
        <Text>Telefone: {userData.phone || 'N/A'}</Text>
        <Text>Função: {userData.role || 'N/A'}</Text>
      </View>

      {/* Navbar na parte inferior */}
      <Navbar />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingBottom: 70, // Garante espaço para a Navbar
  },
  content: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  title: { 
    fontSize: 24, 
    fontWeight: 'bold' 
  },
  loadingContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  loadingText: { 
    fontSize: 18, 
    color: '#666' 
  },
});

export default HomeScreen;
