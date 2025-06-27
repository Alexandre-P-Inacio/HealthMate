import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';

const VideosScreen = () => {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient colors={['#e74c3c', '#c0392b']} style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Health Videos</Text>
        <View style={styles.placeholder} />
      </LinearGradient>

      <ScrollView style={styles.container}>
        <View style={styles.comingSoonContainer}>
          <Ionicons name="play-circle" size={80} color="#e74c3c" />
          <Text style={styles.comingSoonTitle}>Health Videos</Text>
          <Text style={styles.comingSoonText}>Watch educational health videos and tutorials.</Text>
          <Text style={styles.comingSoonSubtext}>🎥 Video library{'\n'}👩‍⚕️ Expert talks{'\n'}📚 Tutorials</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#e74c3c' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15, paddingTop: 50 },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255, 255, 255, 0.2)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  placeholder: { width: 40 },
  container: { flex: 1, backgroundColor: '#F5F6FA' },
  comingSoonContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30, backgroundColor: '#fff', margin: 20, borderRadius: 20, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  comingSoonTitle: { fontSize: 28, fontWeight: 'bold', color: '#2D3142', marginTop: 20, marginBottom: 15 },
  comingSoonText: { fontSize: 16, color: '#666', textAlign: 'center', lineHeight: 24, marginBottom: 20 },
  comingSoonSubtext: { fontSize: 16, color: '#e74c3c', textAlign: 'center', lineHeight: 28 }
});

export default VideosScreen; 