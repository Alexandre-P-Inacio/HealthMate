import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';

// Generic placeholder component that can be reused
const createPlaceholderScreen = (title, icon, color, description, features) => () => {
  const navigation = useNavigation();
  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient colors={['#6A8DFD', '#8A6EF5']} style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={styles.placeholder} />
      </LinearGradient>
      <ScrollView style={styles.container}>
        <View style={styles.comingSoonContainer}>
          <Ionicons name={icon} size={80} color={color} />
          <Text style={styles.comingSoonTitle}>{title}</Text>
          <Text style={styles.comingSoonText}>{description}</Text>
          <Text style={[styles.comingSoonSubtext, { color }]}>{features}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export const SymptomsTrackerScreen = createPlaceholderScreen(
  'Symptoms Tracker',
  'medical',
  '#4ECDC4',
  'Track symptoms and identify patterns for better health insights.',
  '🩺 Symptom logging\n📊 Pattern analysis\n📋 Health reports'
);

export const EmergencyContactsScreen = createPlaceholderScreen(
  'Emergency Contacts',
  'call',
  '#FF6B6B',
  'Quick access to emergency contacts and medical information.',
  '🚨 Emergency contacts\n📞 Quick dial\n🏥 Medical info'
);

export const EmergencyScreen = createPlaceholderScreen(
  'Emergency',
  'medical',
  '#FF6B6B',
  'Emergency assistance and medical alerts.',
  '🚨 Emergency alert\n📞 Call 911\n🏥 Medical ID'
);

export const ReportsScreen = createPlaceholderScreen(
  'Health Reports',
  'analytics',
  '#66BB6A',
  'Generate comprehensive health reports and insights.',
  '📊 Health analytics\n📈 Progress reports\n📋 Medical summaries'
);

export const HealthInsightsScreen = createPlaceholderScreen(
  'Health Insights',
  'bulb',
  '#F7CA88',
  'AI-powered insights and recommendations for your health.',
  '🔍 Health insights\n🤖 AI recommendations\n📈 Trend analysis'
);

export const GoalsScreen = createPlaceholderScreen(
  'Health Goals',
  'trophy',
  '#FFD700',
  'Set and track your health and fitness goals.',
  '🎯 Set goals\n📈 Track progress\n🏆 Achievements'
);

export const RemindersScreen = createPlaceholderScreen(
  'Reminders',
  'notifications',
  '#6A8DFD',
  'Smart reminders for medications, appointments, and health tasks.',
  '⏰ Smart reminders\n💊 Medication alerts\n📅 Appointment notifications'
);

export const HealthConnectScreen = createPlaceholderScreen(
  'Health Connect',
  'link',
  '#4ECDC4',
  'Connect with health devices and apps to sync your data.',
  '📱 Device integration\n⌚ Wearable sync\n🔗 App connections'
);

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#6A8DFD' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15, paddingTop: 50 },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255, 255, 255, 0.2)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  placeholder: { width: 40 },
  container: { flex: 1, backgroundColor: '#F5F6FA' },
  comingSoonContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30, backgroundColor: '#fff', margin: 20, borderRadius: 20, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  comingSoonTitle: { fontSize: 28, fontWeight: 'bold', color: '#2D3142', marginTop: 20, marginBottom: 15 },
  comingSoonText: { fontSize: 16, color: '#666', textAlign: 'center', lineHeight: 24, marginBottom: 20 },
  comingSoonSubtext: { fontSize: 16, textAlign: 'center', lineHeight: 28 }
});

export default SymptomsTrackerScreen; 