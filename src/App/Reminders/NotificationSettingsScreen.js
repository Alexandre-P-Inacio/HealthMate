import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  TouchableOpacity, 
  ScrollView, 
  Switch, 
  Alert, 
  Modal, 
  TextInput,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import NotificationService from '../../services/NotificationService';

const NotificationSettingsScreen = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [preferences, setPreferences] = useState({
    medicationsEnabled: true,
    appointmentsEnabled: true,
    soundEnabled: true,
    vibrationEnabled: true,
    quietHours: { start: '22:00', end: '07:00' }
  });
  const [stats, setStats] = useState({ total: 0, medications: 0, appointments: 0 });
  const [showQuietHoursModal, setShowQuietHoursModal] = useState(false);
  const [tempQuietHours, setTempQuietHours] = useState({ start: '22:00', end: '07:00' });

  useEffect(() => {
    loadPreferences();
    loadStats();
  }, []);

  const loadPreferences = async () => {
    try {
      const prefs = await NotificationService.getNotificationPreferences();
      setPreferences(prefs);
      setTempQuietHours(prefs.quietHours);
    } catch (error) {
      console.error('Erro ao carregar preferências:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const notificationStats = await NotificationService.getNotificationStats();
      setStats(notificationStats);
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  const savePreferences = async (newPreferences) => {
    try {
      await NotificationService.saveNotificationPreferences(newPreferences);
      setPreferences(newPreferences);
      
      // Reagendar notificações se necessário
      if (newPreferences.medicationsEnabled || newPreferences.appointmentsEnabled) {
        await NotificationService.rescheduleAllNotifications();
        await loadStats(); // Recarregar estatísticas
      }
      
      Alert.alert('✅ Success', 'Settings saved successfully!');
    } catch (error) {
      console.error('Error saving preferences:', error);
      Alert.alert('❌ Error', 'Unable to save the settings.');
    }
  };

  const toggleSetting = (setting) => {
    const newPreferences = { ...preferences, [setting]: !preferences[setting] };
    savePreferences(newPreferences);
  };

  const handleQuietHoursChange = () => {
    const newPreferences = { ...preferences, quietHours: tempQuietHours };
    savePreferences(newPreferences);
    setShowQuietHoursModal(false);
  };

  const testNotifications = async () => {
    try {
      // Test permissions
      const hasPermission = await NotificationService.registerForPushNotifications();
      
      if (!hasPermission) {
        Alert.alert(
          '⚠️ Permissions Denied',
          'Please allow notifications in system settings to receive reminders.'
        );
        return;
      }

      // Send test notification
      Alert.alert(
        '🔔 Test Notification',
        'A test notification will be sent in 5 seconds.',
        [
          {
            text: 'OK',
            onPress: async () => {
              try {
                const testDate = new Date(Date.now() + 5000); // 5 seconds in the future
                
                await NotificationService.scheduleMedicationNotification({
                  id: 'test_notification',
                  title: 'Test Medication',
                  scheduled_date: testDate.toISOString().split('T')[0],
                  scheduled_time: testDate.toTimeString().split(' ')[0],
                  dosage: '1'
                });
                
                Alert.alert('✅ Success', 'Test notification scheduled!');
              } catch (error) {
                Alert.alert('❌ Error', 'Unable to schedule test notification.');
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error testing notifications:', error);
      Alert.alert('❌ Error', 'Error testing notifications.');
    }
  };

  const rescheduleAllNotifications = async () => {
    try {
      setLoading(true);
      Alert.alert(
        '🔄 Reschedule Notifications',
        'This will cancel all current notifications and create new ones based on your settings. Continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Continue',
            onPress: async () => {
              try {
                const result = await NotificationService.rescheduleAllNotifications();
                await loadStats();
                Alert.alert(
                  '✅ Complete',
                  `Notifications rescheduled:\n• ${result.medicationCount} medications\n• ${result.appointmentCount} appointments`
                );
              } catch (error) {
                Alert.alert('❌ Error', 'Unable to reschedule notifications.');
              } finally {
                setLoading(false);
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error rescheduling notifications:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <LinearGradient colors={['#9b59b6', '#8e44ad']} style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notification Settings</Text>
          <View style={styles.placeholder} />
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#9b59b6" />
          <Text style={styles.loadingText}>Loading settings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient colors={['#9b59b6', '#8e44ad']} style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notification Settings</Text>
        <View style={styles.placeholder} />
      </LinearGradient>

      <ScrollView style={styles.container}>
        {/* Estatísticas */}
        <View style={styles.statsContainer}>
          <Text style={styles.sectionTitle}>📊 Statistics</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.total}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.medications}</Text>
              <Text style={styles.statLabel}>Medications</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.appointments}</Text>
              <Text style={styles.statLabel}>Appointments</Text>
            </View>
          </View>
        </View>

        {/* Configurações Principais */}
        <View style={styles.settingsContainer}>
          <Text style={styles.sectionTitle}>⚙️ Settings</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="medical" size={24} color="#9b59b6" />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Medications</Text>
                <Text style={styles.settingSubtitle}>Medication reminders</Text>
              </View>
            </View>
            <Switch
              value={preferences.medicationsEnabled}
              onValueChange={() => toggleSetting('medicationsEnabled')}
              trackColor={{ false: '#767577', true: '#9b59b6' }}
              thumbColor={preferences.medicationsEnabled ? '#fff' : '#f4f3f4'}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="calendar" size={24} color="#9b59b6" />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Appointments</Text>
                <Text style={styles.settingSubtitle}>Medical appointment reminders</Text>
              </View>
            </View>
            <Switch
              value={preferences.appointmentsEnabled}
              onValueChange={() => toggleSetting('appointmentsEnabled')}
              trackColor={{ false: '#767577', true: '#9b59b6' }}
              thumbColor={preferences.appointmentsEnabled ? '#fff' : '#f4f3f4'}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="volume-high" size={24} color="#9b59b6" />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Sound</Text>
                <Text style={styles.settingSubtitle}>Play sound for notifications</Text>
              </View>
            </View>
            <Switch
              value={preferences.soundEnabled}
              onValueChange={() => toggleSetting('soundEnabled')}
              trackColor={{ false: '#767577', true: '#9b59b6' }}
              thumbColor={preferences.soundEnabled ? '#fff' : '#f4f3f4'}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="phone-portrait" size={24} color="#9b59b6" />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Vibration</Text>
                <Text style={styles.settingSubtitle}>Vibrate for notifications</Text>
              </View>
            </View>
            <Switch
              value={preferences.vibrationEnabled}
              onValueChange={() => toggleSetting('vibrationEnabled')}
              trackColor={{ false: '#767577', true: '#9b59b6' }}
              thumbColor={preferences.vibrationEnabled ? '#fff' : '#f4f3f4'}
            />
          </View>

          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => setShowQuietHoursModal(true)}
          >
            <View style={styles.settingInfo}>
              <Ionicons name="moon" size={24} color="#9b59b6" />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Quiet Hours</Text>
                <Text style={styles.settingSubtitle}>
                  {preferences.quietHours.start} - {preferences.quietHours.end}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Ações */}
        <View style={styles.actionsContainer}>
          <Text style={styles.sectionTitle}>🛠️ Actions</Text>
          
          <TouchableOpacity style={styles.actionButton} onPress={testNotifications}>
            <Ionicons name="notifications" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Test Notifications</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={rescheduleAllNotifications}>
            <Ionicons name="refresh" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Reschedule All</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButton, styles.dangerButton]} 
            onPress={async () => {
              Alert.alert(
                '⚠️ Cancel All Notifications',
                'This will cancel all scheduled notifications. You can reschedule them at any time.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Confirm',
                    style: 'destructive',
                    onPress: async () => {
                      try {
                        await NotificationService.cancelAllMedicationNotifications();
                        await NotificationService.cancelAllAppointmentNotifications();
                        await loadStats();
                        Alert.alert('✅ Success', 'All notifications canceled.');
                      } catch (error) {
                        Alert.alert('❌ Error', 'Unable to cancel notifications.');
                      }
                    }
                  }
                ]
              );
            }}
          >
            <Ionicons name="close-circle" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Cancel All</Text>
          </TouchableOpacity>
        </View>

        {/* Modal de Horas de Silêncio */}
        <Modal
          visible={showQuietHoursModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowQuietHoursModal(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Quiet Hours</Text>
              <Text style={styles.modalSubtitle}>
                During these hours, notifications will be silenced
              </Text>

              <View style={styles.timeInputContainer}>
                <Text style={styles.timeLabel}>Start:</Text>
                <TextInput
                  style={styles.timeInput}
                  value={tempQuietHours.start}
                  onChangeText={(text) => setTempQuietHours({ ...tempQuietHours, start: text })}
                  placeholder="22:00"
                  maxLength={5}
                />
              </View>

              <View style={styles.timeInputContainer}>
                <Text style={styles.timeLabel}>End:</Text>
                <TextInput
                  style={styles.timeInput}
                  value={tempQuietHours.end}
                  onChangeText={(text) => setTempQuietHours({ ...tempQuietHours, end: text })}
                  placeholder="07:00"
                  maxLength={5}
                />
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => {
                    setTempQuietHours(preferences.quietHours);
                    setShowQuietHoursModal(false);
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.confirmButton]}
                  onPress={handleQuietHoursChange}
                >
                  <Text style={styles.confirmButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { 
    flex: 1, 
    backgroundColor: '#9b59b6' 
  },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 20, 
    paddingVertical: 15, 
    paddingTop: 50 
  },
  backButton: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    backgroundColor: 'rgba(255, 255, 255, 0.2)', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  headerTitle: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: '#fff' 
  },
  placeholder: { 
    width: 40 
  },
  container: { 
    flex: 1, 
    backgroundColor: '#F5F6FA' 
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F6FA'
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666'
  },
  statsContainer: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3142',
    marginBottom: 16
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around'
  },
  statItem: {
    alignItems: 'center'
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#9b59b6'
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4
  },
  settingsContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    marginBottom: 8
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  settingText: {
    marginLeft: 12,
    flex: 1
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3142'
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2
  },
  actionsContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 32,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#9b59b6',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12
  },
  dangerButton: {
    backgroundColor: '#e74c3c'
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxWidth: 300
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D3142',
    textAlign: 'center',
    marginBottom: 8
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20
  },
  timeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16
  },
  timeLabel: {
    fontSize: 16,
    color: '#2D3142',
    width: 60
  },
  timeInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    textAlign: 'center'
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 8
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dee2e6'
  },
  confirmButton: {
    backgroundColor: '#9b59b6'
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600'
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  }
});

export default NotificationSettingsScreen; 