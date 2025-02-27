import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, Alert, TouchableOpacity } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import DataUser from '../../navigation/DataUser';
import Navbar from '../Components/Navbar';

const AccountScreen = ({ navigation }) => {
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    const user = DataUser.getUserData();
    
    if (user) {
      setUserData(user);
    } else {
      Alert.alert('Error', 'User data not found.');
      navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
    }
  }, []);

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', onPress: () => navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] }) },
    ]);
  };

  if (!userData) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading user data...</Text>
      </View>
    );
  }

  const profileImage = userData.pfpimg
    ? { uri: `data:image/png;base64,${userData.pfpimg}` }
    : { uri: 'https://i.pravatar.cc/150?img=3' };

  return (
    <View style={styles.container}>
      {/* Profile Section */}
      <View style={styles.profileSection}>
        <View style={styles.profileImageContainer}>
          <Image source={profileImage} style={styles.profileImage} />
        </View>
        <Text style={styles.profileName}>{userData.fullname || 'User'}</Text>
        <Text style={styles.profileInfo}>📧 {userData.email || 'N/A'}</Text>
        <Text style={styles.profileInfo}>📞 {userData.phone || 'N/A'}</Text>
      </View>

      {/* Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.settingsButton} onPress={() => navigation.navigate('SettingsScreen')}>
          <FontAwesome name="cog" size={22} color="#fff" />
          <Text style={styles.settingsText}>Edit Profile</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <FontAwesome name="sign-out" size={22} color="#fff" />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </View>

      <Navbar />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7', paddingBottom: 70 },
  profileSection: { 
    alignItems: 'center', 
    marginVertical: 30, 
    backgroundColor: '#fff', 
    padding: 30, 
    borderRadius: 20, 
    marginHorizontal: 20, 
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }
  },
  profileImageContainer: { 
    width: 130, 
    height: 130, 
    borderRadius: 65, 
    backgroundColor: '#fff', 
    elevation: 10, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: 15
  },
  profileImage: { width: 120, height: 120, borderRadius: 60, borderWidth: 3, borderColor: '#3498db' },
  profileName: { fontSize: 24, fontWeight: 'bold', color: '#222', marginBottom: 5 },
  profileInfo: { fontSize: 16, color: '#555', marginVertical: 2, textAlign: 'center' },
  buttonContainer: { marginTop: 20, marginHorizontal: 20 },
  settingsButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: '#3498db', 
    paddingVertical: 18, 
    borderRadius: 12, 
    marginBottom: 15, 
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 }
  },
  settingsText: { color: '#fff', fontSize: 17, fontWeight: 'bold', marginLeft: 10 },
  logoutButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: '#e74c3c', 
    paddingVertical: 18, 
    borderRadius: 12, 
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 }
  },
  logoutText: { color: '#fff', fontSize: 17, fontWeight: 'bold', marginLeft: 10 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 18, color: '#666' },
});

export default AccountScreen;
