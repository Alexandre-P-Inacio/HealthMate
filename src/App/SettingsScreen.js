import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Image, Alert, Platform, ScrollView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons'; // Ícones do Expo
import supabase from '../../supabase';
import DataUser from '../../navigation/DataUser';
import * as Crypto from 'expo-crypto'; // Biblioteca para hash da senha

const SettingsScreen = ({ navigation, route }) => {
  const userId = route.params?.userId || DataUser.getUserData()?.id;
  const [userData, setUserData] = useState(null);
  const [fullname, setFullname] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [pfpimg, setPfpimg] = useState('');
  const [previewImage, setPreviewImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswordFields, setShowPasswordFields] = useState(false);

  const defaultImage = 'https://i.pravatar.cc/150?img=3';

  useEffect(() => {
    if (!userId) {
      Alert.alert('Error', 'User ID not found.');
      navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
      return;
    }

    const fetchUserData = async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        Alert.alert('Error', 'Failed to load user data.');
        return;
      }

      if (data) {
        setUserData(data);
        setFullname(data.fullname || '');
        setEmail(data.email || '');
        setPhone(data.phone || '');
        setPfpimg(data.pfpimg ? `data:image/jpeg;base64,${data.pfpimg}` : defaultImage);
      }
    };

    fetchUserData();
  }, [userId]);

  const pickImage = async () => {
    if (!editing) return; // Permite alterar a imagem apenas quando está editando

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Allow access to gallery.');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled) {
      setPreviewImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const handleSave = async () => {
    try {
      setUploading(true);
      
      const updateData = { fullname, email, phone };

      if (previewImage) {
        updateData.pfpimg = previewImage.split(',')[1]; // Remover prefixo data:image/jpeg;base64,
      }

      if (showPasswordFields) {
        if (password.length < 6) {
          Alert.alert('Error', 'Password must be at least 6 characters long.');
          setUploading(false);
          return;
        }
        if (password !== confirmPassword) {
          Alert.alert('Error', 'Passwords do not match.');
          setUploading(false);
          return;
        }

        const hashedPassword = await Crypto.digestStringAsync(
          Crypto.CryptoDigestAlgorithm.SHA256,
          password
        );

        updateData.password = hashedPassword;
      }

      const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', userId);

      if (error) throw error;

      setPfpimg(previewImage || pfpimg);
      setPreviewImage(null);
      setEditing(false);
      setShowPasswordFields(false);
      setPassword('');
      setConfirmPassword('');
      DataUser.setUserData({ ...userData, ...updateData });

      Alert.alert('Success', 'Data updated successfully!', [
        { text: 'OK', onPress: () => navigation.navigate('AccountScreen') }
      ]);
    } catch (error) {
      console.error('Error saving:', error);
      Alert.alert('Error', 'Could not save data.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header com botão de voltar */}
      <View style={styles.headerContainer}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color="#3498db" />
        </TouchableOpacity>
        <Text style={styles.header}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.profileContainer}>
          <TouchableOpacity onPress={pickImage} disabled={!editing} style={styles.imageContainer}>
            <Image source={{ uri: previewImage || pfpimg }} style={styles.profileImage} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setEditing(!editing)} style={styles.editButton}>
            <Ionicons name={editing ? 'checkmark-circle' : 'create'} size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput style={[styles.input, !editing && styles.disabledInput]} value={fullname} onChangeText={setFullname} editable={editing} />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Email</Text>
          <TextInput style={[styles.input, !editing && styles.disabledInput]} value={email} onChangeText={setEmail} editable={editing} keyboardType="email-address" />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Phone</Text>
          <TextInput style={[styles.input, !editing && styles.disabledInput]} value={phone} onChangeText={setPhone} editable={editing} keyboardType="phone-pad" />
        </View>

        {editing && (
          <TouchableOpacity onPress={() => setShowPasswordFields(!showPasswordFields)} style={styles.passwordButton}>
            <Text style={styles.passwordButtonText}>{showPasswordFields ? 'Cancel' : 'Change Password'}</Text>
          </TouchableOpacity>
        )}

        {showPasswordFields && (
          <>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>New Password</Text>
              <TextInput style={styles.input} value={password} onChangeText={setPassword} secureTextEntry placeholder="Enter new password" />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Confirm Password</Text>
              <TextInput style={styles.input} value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry placeholder="Repeat new password" />
            </View>
          </>
        )}

        {editing && (
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>{uploading ? 'Saving...' : 'Save'}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
};
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f4f4f4' },
    headerContainer: { flexDirection: 'row', alignItems: 'center', paddingTop: Platform.OS === 'android' ? 40 : 20, paddingHorizontal: 20 },
    backButton: { marginRight: 15 },
    header: { fontSize: 26, fontWeight: 'bold' },
    scrollContainer: { padding: 20 },
    profileContainer: { alignItems: 'center', marginBottom: 20 },
    imageContainer: { marginBottom: 10 },
    profileImage: { width: 120, height: 120, borderRadius: 60, borderWidth: 3, borderColor: '#3498db' },
    editButton: { position: 'absolute', bottom: 0, right: -10, backgroundColor: '#3498db', padding: 8, borderRadius: 20 },
    inputContainer: { marginBottom: 15 },
    label: { fontSize: 16, fontWeight: 'bold', marginBottom: 5 },
    input: { backgroundColor: '#fff', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#ddd' },
    disabledInput: { backgroundColor: '#e0e0e0', color: '#888' },
    passwordButton: { alignSelf: 'center', marginBottom: 10 },
    passwordButtonText: { color: '#3498db', fontWeight: 'bold' },
    saveButton: { backgroundColor: '#3498db', padding: 15, borderRadius: 8, alignItems: 'center' },
    saveButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  });
  
export default SettingsScreen;




