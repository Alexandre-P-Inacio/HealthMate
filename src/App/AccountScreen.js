import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
  Alert,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import supabase from '../../supabase';
import Navbar from '../Components/Navbar'; // Importa a Navbar
import { StackActions } from '@react-navigation/native';

const AccountScreen = ({ navigation, route }) => {
  const [userData, setUserData] = useState(null);
  const userId = route.params?.userId;

  useEffect(() => {
    if (!userId) {
      Alert.alert('Erro', 'User ID não encontrado.');
      navigation.reset({
        index: 0,
        routes: [{ name: 'Welcome' }],
      });
      return;
    }

    const fetchUserData = async () => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single();

        if (error || !data) {
          Alert.alert('Erro', 'Utilizador não encontrado.');
          navigation.reset({
            index: 0,
            routes: [{ name: 'Welcome' }],
          });
          return;
        }

        setUserData(data);
      } catch (error) {
        console.error('Erro ao buscar dados do utilizador:', error);
        Alert.alert('Erro', 'Falha ao carregar os dados do utilizador.');
      }
    };

    fetchUserData();
  }, [userId]);

  const handleLogout = () => {
    Alert.alert('Logout', 'Tem a certeza que deseja sair?', [
      {
        text: 'Cancelar',
        style: 'cancel',
      },
      {
        text: 'Sair',
        onPress: () => {
          navigation.reset({
            index: 0,
            routes: [{ name: 'Welcome' }], // Remove todas as telas do histórico
          });
        },
      },
    ]);
  };
  
  
  

  if (!userData) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>A carregar dados do utilizador...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <FontAwesome name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Meu Perfil</Text>
      </View>

      <View style={styles.profileSection}>
        <Image
          source={{
            uri: userData.profileImage || 'https://i.pravatar.cc/150?img=3',
          }}
          style={styles.profileImage}
        />
        <Text style={styles.profileName}>{userData.fullname || 'Utilizador'}</Text>
        <Text style={styles.profileInfo}>Email: {userData.email || 'N/A'}</Text>
        <Text style={styles.profileInfo}>Telefone: {userData.phone || 'N/A'}</Text>
        <Text style={styles.profileInfo}>Função: {userData.role || 'N/A'}</Text>
      </View>

      <FlatList
        data={[
          { id: '1', icon: 'home', label: 'Home', action: () => navigation.navigate('HomeScreen', { userId }) },
          { id: '2', icon: 'table', label: 'Tabelas', action: () => navigation.navigate('TableScreen', { userId }) },
        ]}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.menuItem} onPress={item.action}>
            <View style={styles.menuItemContent}>
              <FontAwesome name={item.icon} size={20} color="#4A90E2" />
              <Text style={styles.menuLabel}>{item.label}</Text>
            </View>
            <FontAwesome name="chevron-right" size={16} color="#999" />
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.menuList}
      />

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      {/* Navbar fixa na parte inferior */}
      <Navbar />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f9f9f9', 
    paddingBottom: 70, 
  },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 16, 
    backgroundColor: '#4A90E2', 
    borderBottomLeftRadius: 15, 
    borderBottomRightRadius: 15 
  },
  backButton: { 
    marginRight: 10 
  },
  headerTitle: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    color: '#fff' 
  },
  profileSection: { 
    alignItems: 'center', 
    marginVertical: 20, 
    backgroundColor: '#fff', 
    padding: 20, 
    borderRadius: 12, 
    marginHorizontal: 16, 
    shadowColor: '#000', 
    shadowOpacity: 0.1, 
    shadowRadius: 5, 
    elevation: 5 
  },
  profileImage: { 
    width: 100, 
    height: 100, 
    borderRadius: 50, 
    marginBottom: 10 
  },
  profileName: { 
    fontSize: 22, 
    fontWeight: 'bold', 
    color: '#333', 
    marginBottom: 5 
  },
  profileInfo: { 
    fontSize: 16, 
    color: '#666', 
    marginBottom: 2 
  },
  menuList: { 
    marginTop: 10, 
    paddingHorizontal: 16 
  },
  menuItem: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingVertical: 15, 
    backgroundColor: '#fff', 
    marginVertical: 5, 
    paddingHorizontal: 15, 
    borderRadius: 10, 
    shadowColor: '#000', 
    shadowOpacity: 0.1, 
    shadowRadius: 5, 
    elevation: 3 
  },
  menuLabel: { 
    fontSize: 16, 
    color: '#333', 
    marginLeft: 10 
  },
  logoutButton: { 
    marginTop: 20, 
    marginHorizontal: 16, 
    paddingVertical: 15, 
    backgroundColor: '#e74c3c', 
    borderRadius: 8, 
    alignItems: 'center', 
    shadowColor: '#000', 
    shadowOpacity: 0.1, 
    shadowRadius: 5, 
    elevation: 5 
  },
  logoutText: { 
    color: '#fff', 
    fontSize: 16, 
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

export default AccountScreen;
