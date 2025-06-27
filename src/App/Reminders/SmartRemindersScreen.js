import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';

const SmartRemindersScreen = () => {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient colors={['#3498db', '#2980b9']} style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Smart Reminders</Text>
        <View style={styles.placeholder} />
      </LinearGradient>

      <ScrollView style={styles.container}>
        <View style={styles.comingSoonContainer}>
          <Ionicons name="bulb" size={80} color="#3498db" />
          <Text style={styles.comingSoonTitle}>Smart Reminders</Text>
          <Text style={styles.comingSoonText}>AI-powered intelligent reminders based on your health patterns.</Text>
          <Text style={styles.comingSoonSubtext}>🤖 AI suggestions{'\n'}📊 Pattern-based alerts{'\n'}🎯 Personalized timing</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#3498db' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15, paddingTop: 50 },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255, 255, 255, 0.2)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  placeholder: { width: 40 },
  container: { flex: 1, backgroundColor: '#F5F6FA' },
  comingSoonContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30, backgroundColor: '#fff', margin: 20, borderRadius: 20, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  comingSoonTitle: { fontSize: 28, fontWeight: 'bold', color: '#2D3142', marginTop: 20, marginBottom: 15 },
  comingSoonText: { fontSize: 16, color: '#666', textAlign: 'center', lineHeight: 24, marginBottom: 20 },
  comingSoonSubtext: { fontSize: 16, color: '#3498db', textAlign: 'center', lineHeight: 28 }
});

export default SmartRemindersScreen; 