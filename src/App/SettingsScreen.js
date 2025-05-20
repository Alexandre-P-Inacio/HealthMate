import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Image, Alert, ScrollView, ActivityIndicator, StatusBar, Switch } from 'react-native';
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
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [errors, setErrors] = useState({});
  
  // Notification preferences
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [medicationReminders, setMedicationReminders] = useState(true);
  const [generalUpdates, setGeneralUpdates] = useState(true);
  const [promotionalOffers, setPromotionalOffers] = useState(false);

  const defaultImage = 'https://i.pravatar.cc/150?img=3';

  useEffect(() => {
    if (!userId) {
      Alert.alert('Error', 'User ID not found.');
      navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
      return;
    }

    fetchUserData();
  }, [userId]);

  const fetchUserData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;

      if (data) {
        setUserData(data);
        setFullname(data.fullname || '');
        setEmail(data.email || '');
        setPhone(data.phone || '');
        setPfpimg(data.pfpimg ? `data:image/jpeg;base64,${data.pfpimg}` : defaultImage);
        setNotificationsEnabled(data.notificationsEnabled ?? true);
        setMedicationReminders(data.medicationReminders ?? true);
        setGeneralUpdates(data.generalUpdates ?? true);
        setPromotionalOffers(data.promotionalOffers ?? false);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      Alert.alert('Error', 'Failed to load user data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!fullname.trim()) newErrors.fullname = 'Name is required';
    if (!email.trim()) newErrors.email = 'Email is required';
    else if (!validateEmail(email)) newErrors.email = 'Email format is invalid';
    
    if (showPasswordFields) {
      if (password.length < 6) newErrors.password = 'Password must be at least 6 characters';
      if (password !== confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const pickImage = async () => {
    if (!editing) return;

    try {
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
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const handleEdit = () => {
    if (editing) {
      // If currently editing, ask for confirmation before canceling
      if (
        fullname !== userData.fullname ||
        email !== userData.email ||
        phone !== userData.phone ||
        previewImage !== null ||
        password !== '' ||
        confirmPassword !== ''
      ) {
        Alert.alert(
          'Discard Changes',
          'You have unsaved changes. Are you sure you want to discard them?',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Discard', 
              style: 'destructive', 
              onPress: () => {
                setFullname(userData.fullname || '');
                setEmail(userData.email || '');
                setPhone(userData.phone || '');
                setPreviewImage(null);
                setPassword('');
                setConfirmPassword('');
                setShowPasswordFields(false);
                setEditing(false);
                setErrors({});
              } 
            },
          ]
        );
      } else {
        setEditing(false);
      }
    } else {
      setEditing(true);
    }
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    
    try {
      setUploading(true);
      
      const updateData = { 
        fullname, 
        email, 
        phone
      };

      if (previewImage) {
        updateData.pfpimg = previewImage.split(',')[1];
      }

      if (showPasswordFields && password) {
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
      
      // Update the local userData state and global user data
      const updatedUserData = { ...userData, ...updateData };
      setUserData(updatedUserData);
      DataUser.setUserData(updatedUserData);

      Alert.alert('Success', 'Profile updated successfully!', [
        { 
          text: 'OK', 
          onPress: () => {
            navigation.goBack();
          }
        }
      ]);
    } catch (error) {
      console.error('Error saving:', error);
      Alert.alert('Error', error.message || 'Could not save data. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const toggleNotifications = () => {
    setNotificationsEnabled(previousState => !previousState);
  };

  const toggleMedicationReminders = () => {
    setMedicationReminders(previousState => !previousState);
  };

  const toggleGeneralUpdates = () => {
    setGeneralUpdates(previousState => !previousState);
  };

  const togglePromotionalOffers = () => {
    setPromotionalOffers(previousState => !previousState);
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color="#3498db" />
        </TouchableOpacity>
        <Text style={styles.header}>Settings</Text>
        <TouchableOpacity onPress={handleEdit} style={styles.editButton}>
          <Ionicons name={editing ? "close-circle" : "create"} size={24} color="#3498db" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.profileContainer}>
          <TouchableOpacity onPress={pickImage} disabled={!editing} style={styles.imageContainer}>
            <Image source={{ uri: previewImage || pfpimg }} style={styles.profileImage} />
          </TouchableOpacity>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput 
            style={[
              styles.input, 
              !editing && styles.disabledInput,
              errors.fullname && styles.inputError
            ]} 
            value={fullname} 
            onChangeText={setFullname} 
            editable={editing} 
            placeholder="Enter your full name"
          />
          {errors.fullname && <Text style={styles.errorText}>{errors.fullname}</Text>}
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Email</Text>
          <TextInput 
            style={[
              styles.input, 
              !editing && styles.disabledInput,
              errors.email && styles.inputError
            ]} 
            value={email} 
            onChangeText={setEmail} 
            editable={editing} 
            keyboardType="email-address"
            placeholder="your@email.com"
          />
          {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Phone</Text>
          <TextInput 
            style={[styles.input, !editing && styles.disabledInput]} 
            value={phone} 
            onChangeText={setPhone} 
            editable={editing} 
            keyboardType="phone-pad"
            placeholder="Your phone number"
          />
        </View>

        {editing && (
          <TouchableOpacity onPress={() => setShowPasswordFields(!showPasswordFields)} style={styles.passwordButton}>
            <Text style={styles.passwordButtonText}>
              {showPasswordFields ? 'Cancel Password Change' : 'Change Password'}
            </Text>
          </TouchableOpacity>
        )}

        {showPasswordFields && (
          <>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>New Password</Text>
              <TextInput 
                style={[styles.input, errors.password && styles.inputError]} 
                value={password} 
                onChangeText={setPassword} 
                secureTextEntry 
                placeholder="Enter new password (min 6 characters)" 
              />
              {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Confirm Password</Text>
              <TextInput 
                style={[styles.input, errors.confirmPassword && styles.inputError]} 
                value={confirmPassword} 
                onChangeText={setConfirmPassword} 
                secureTextEntry 
                placeholder="Confirm new password" 
              />
              {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
            </View>
          </>
        )}

        {editing && (
          <TouchableOpacity 
            style={[styles.saveButton, uploading && styles.disabledButton]} 
            onPress={handleSave}
            disabled={uploading}
          >
            {uploading ? (
              <View style={styles.loadingButtonContent}>
                <ActivityIndicator size="small" color="#fff" />
                <Text style={[styles.saveButtonText, { marginLeft: 10 }]}>Saving...</Text>
              </View>
            ) : (
              <Text style={styles.saveButtonText}>Save Changes</Text>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f4f4f4' 
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#555',
  },
  headerContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    paddingTop: StatusBar.currentHeight + 10 || 40,
    paddingHorizontal: 20,
    paddingBottom: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eaeaea',
  },
  backButton: { 
    padding: 5,
  },
  header: { 
    fontSize: 24, 
    fontWeight: 'bold',
    color: '#333',
  },
  scrollContainer: { 
    padding: 20,
    paddingBottom: 40,
  },
  profileContainer: { 
    alignItems: 'center', 
    marginBottom: 30,
  },
  imageContainer: { 
    position: 'relative',
    marginBottom: 10,
  },
  profileImage: { 
    width: 120, 
    height: 120, 
    borderRadius: 60, 
    borderWidth: 3, 
    borderColor: '#3498db' 
  },
  editButton: { 
    padding: 5,
  },
  inputContainer: { 
    marginBottom: 20,
  },
  label: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    marginBottom: 8,
    color: '#333',
  },
  input: { 
    backgroundColor: '#fff', 
    padding: 14, 
    borderRadius: 8, 
    borderWidth: 1, 
    borderColor: '#ddd',
    fontSize: 16,
  },
  disabledInput: { 
    backgroundColor: '#f8f8f8', 
    color: '#666',
    borderColor: '#eee',
  },
  inputError: {
    borderColor: '#e74c3c',
  },
  errorText: {
    color: '#e74c3c',
    fontSize: 12,
    marginTop: 5,
    marginLeft: 2,
  },
  passwordButton: { 
    alignSelf: 'center', 
    marginBottom: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#f1f9ff',
  },
  passwordButtonText: { 
    color: '#3498db', 
    fontWeight: 'bold',
    fontSize: 15,
  },
  saveButton: { 
    backgroundColor: '#3498db', 
    padding: 16, 
    borderRadius: 10, 
    alignItems: 'center',
    marginTop: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  disabledButton: {
    backgroundColor: '#a3d0f5',
  },
  saveButtonText: { 
    color: '#fff', 
    fontSize: 16, 
    fontWeight: 'bold',
  },
  loadingButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default SettingsScreen