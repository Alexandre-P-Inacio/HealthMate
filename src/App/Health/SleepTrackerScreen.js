import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';

const SleepTrackerScreen = () => {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient colors={['#6A8DFD', '#8A6EF5']} style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sleep Tracker</Text>
        <View style={styles.placeholder} />
      </LinearGradient>

      <ScrollView style={styles.container}>
        <View style={styles.comingSoonContainer}>
          <Ionicons name="moon" size={80} color="#8E24AA" />
          <Text style={styles.comingSoonTitle}>Sleep Tracker</Text>
          <Text style={styles.comingSoonText}>
            Track your sleep patterns, quality, and duration to improve your rest.
          </Text>
          <Text style={styles.comingSoonSubtext}>
            🌙 Sleep Duration{'\n'}
            📊 Sleep Quality{'\n'}
            ⏰ Bedtime Reminders{'\n'}
            📈 Sleep Analytics
          </Text>
          <View style={styles.featureList}>
            <Text style={styles.featureTitle}>Coming Soon:</Text>
            <Text style={styles.featureItem}>• Sleep duration tracking</Text>
            <Text style={styles.featureItem}>• Sleep quality monitoring</Text>
            <Text style={styles.featureItem}>• Bedtime reminders</Text>
            <Text style={styles.featureItem}>• Sleep pattern analysis</Text>
            <Text style={styles.featureItem}>• Integration with wearables</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#6A8DFD',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    paddingTop: 50,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  placeholder: {
    width: 40,
  },
  container: {
    flex: 1,
    backgroundColor: '#F5F6FA',
  },
  comingSoonContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  comingSoonTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2D3142',
    marginTop: 20,
    marginBottom: 15,
  },
  comingSoonText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
  comingSoonSubtext: {
    fontSize: 16,
    color: '#8E24AA',
    textAlign: 'center',
    lineHeight: 28,
    marginBottom: 30,
  },
  featureList: {
    alignSelf: 'stretch',
    backgroundColor: '#F8F9FA',
    padding: 20,
    borderRadius: 15,
    marginTop: 20,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3142',
    marginBottom: 15,
  },
  featureItem: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    paddingLeft: 5,
  },
});

export default SleepTrackerScreen; 