import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import DataUser from '../../navigation/DataUser'; // Importing DataUser.js file
import Navbar from '../Components/Navbar';

const HomeScreen = () => {
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    // Try to fetch user data directly from DataUser.js
    const user = DataUser.getUserData();

    if (user) {
      setUserData(user);
    } else {
      Alert.alert('Error', 'No user found.');
    }
  }, []);

  if (!userData) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading user data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Welcome, {userData.fullname}!</Text>
        <Text>ID: {userData.id}</Text>
        <Text>Email: {userData.email || 'N/A'}</Text>
        <Text>Phone: {userData.phone || 'N/A'}</Text>
        <Text>Role: {userData.role || 'N/A'}</Text>
      </View>

      <Navbar />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'space-between', alignItems: 'center', paddingBottom: 70, },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 18, color: '#666' },
});

export default HomeScreen;
