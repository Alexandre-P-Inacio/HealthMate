import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import supabase from '../../supabase';
import Navbar from '../Components/Navbar';

const AccountScreen = ({ navigation, route }) => {
  const [userData, setUserData] = useState(null);
  const [uploading, setUploading] = useState(false);
  const userId = route.params?.userId;

  useEffect(() => {
    if (!userId) {
      Alert.alert('Erro', 'User  ID não encontrado.');
      navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
      return;
    }
    fetchUserData();
  }, [userId]);

  const fetchUserData = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error || !data) {
        Alert.alert('Erro', 'Utilizador não encontrado.');
        navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
        return;
      }

      setUserData(data);
    } catch (error) {
      console.error('Erro ao buscar dados do utilizador:', error);
      Alert.alert('Erro', 'Falha ao carregar os dados do utilizador.');
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão necessária', 'Dá permissão para aceder à galeria.');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      uploadImage(result.assets[0].uri);
    }
  };

  const uploadImage = async (imageUri) => {
    try {
      setUploading(true);
      const response = await fetch(imageUri);
      const blob = await response.blob();
      const reader = new FileReader();

      reader.onloadend = async () => {
        const base64Data = reader.result.split(',')[1]; // Remove o prefixo base64

        const { error } = await supabase
          .from('users')
          .update({ pfpimg: base64Data })
          .eq('id', userId);

        if (error) throw error;

        setUserData((prev) => ({ ...prev, pfpimg: imageUri }));
        Alert.alert('Sucesso', 'Imagem de perfil atualizada!');
      };

      reader.readAsDataURL(blob);
    } catch (error) {
      console.error('Erro ao fazer upload da imagem:', error);
      Alert.alert('Erro', 'Falha ao carregar a imagem.');
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Tem a certeza que deseja sair?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', onPress: () => navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] }) },
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
        <TouchableOpacity onPress={pickImage} disabled={uploading}>
          <Image
            source={{ uri: userData?.pfpimg || 'https://i.pravatar.cc/150?img=3' }}
            style={styles.profileImage}
          />
          {uploading && <Text style={styles.uploadingText}>Carregando...</Text>}
        </TouchableOpacity>
        <Text style={styles.profileName}>{userData.fullname || 'Utilizador'}</Text>
        <Text style={styles.profileInfo}>Email: {userData.email || 'N/A'}</Text>
        <Text style={styles.profileInfo}>Telefone: {userData.phone || 'N/A'}</Text>
        <Text style={styles.profileInfo}>Função: {userData.role || 'N/A'}</Text>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      <Navbar />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9f9f9', paddingBottom: 70 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#4A90E2', borderBottomLeftRadius: 15, borderBottomRightRadius: 15 },
  backButton: { marginRight: 10 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  profileSection: { alignItems: 'center', marginVertical: 20, backgroundColor: '#fff', padding: 20, borderRadius: 12, marginHorizontal: 16, elevation: 5 },
  profileImage: { width: 100, height: 100, borderRadius: 50, marginBottom: 10 },
  uploadingText: { fontSize: 14, color: 'gray' },
  profileName: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  profileInfo: { fontSize: 16, color: '#666', marginBottom: 2 },
  logoutButton: { marginTop: 20, marginHorizontal: 16, paddingVertical: 15, backgroundColor: '#e74c3c', borderRadius: 8, alignItems: 'center', elevation: 5 },
  logoutText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 18, color: '#666' },
});

export default AccountScreen;