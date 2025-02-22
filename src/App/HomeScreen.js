import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import supabase from '../../supabase';
import Navbar from '../Components/Navbar';

const HomeScreen = ({ route }) => {
  const [userData, setUserData] = useState(null);
  const userId = route.params?.userId;

  useEffect(() => {
    const fetchUserData = async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        Alert.alert('Erro', 'Utilizador não encontrado.');
        return;
      }
      setUserData(data);
    };

    if (userId) {
      fetchUserData();
    }
  }, [userId]);

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
        <Text>Email: {userData.email || 'N/A'}</Text>
        <Text>Telefone: {userData.phone || 'N/A'}</Text>
        <Text>Função: {userData.role}</Text>
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
