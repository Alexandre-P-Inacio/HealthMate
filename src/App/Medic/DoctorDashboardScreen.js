import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  Platform,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import { FontAwesome, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import supabase from '../../../supabase';
import DataUser from '../../../navigation/DataUser';
import Navbar from '../../Components/Navbar';

const DoctorDashboardScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [doctorData, setDoctorData] = useState(null);
  const [userData, setUserData] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [selectedTab, setSelectedTab] = useState('upcoming'); // 'upcoming' or 'past'

  useEffect(() => {
    loadDoctorData();
    loadAppointments();
  }, []);

  const loadDoctorData = async () => {
    try {
      const userId = DataUser.getUserData()?.id;
      if (!userId) {
        Alert.alert('Error', 'User data not found');
        return;
      }

      // First try to get doctor data
      const { data: doctorData, error: doctorError } = await supabase
        .from('doctors')
        .select('*')
        .eq('id', userId)
        .single();

      if (doctorError && doctorError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        console.error('Error loading doctor data:', doctorError);
        Alert.alert('Error', 'Failed to load doctor profile');
        return;
      }

      // Then get user data for profile picture
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (userError) {
        console.error('Error loading user data:', userError);
        Alert.alert('Error', 'Failed to load user data');
        return;
      }

      setDoctorData(doctorData);
      setUserData(userData);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load profile data');
    }
  };

  const loadAppointments = async () => {
    try {
      const userId = DataUser.getUserData()?.id;
      if (!userId) return;

      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          users (
            fullname,
            email,
            phone
          )
        `)
        .eq('doctor_id', userId)
        .order('appointment_datetime', { ascending: true });

      if (error) throw error;

      const now = new Date();
      const upcoming = data.filter(apt => new Date(apt.appointment_datetime) > now);
      const past = data.filter(apt => new Date(apt.appointment_datetime) <= now);

      setAppointments({
        upcoming,
        past
      });
    } catch (error) {
      console.error('Error loading appointments:', error);
      Alert.alert('Error', 'Failed to load appointments');
    }
  };

  const updateAppointmentStatus = async (appointmentId, newStatus) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: newStatus })
        .eq('id', appointmentId);

      if (error) throw error;
      loadAppointments(); // Reload appointments after update
    } catch (error) {
      console.error('Error updating appointment:', error);
      Alert.alert('Error', 'Failed to update appointment status');
    }
  };

  const formatDateTime = (dateTimeStr) => {
    const date = new Date(dateTimeStr);
    return date.toLocaleString();
  };

  const getProfileImage = () => {
    // First try doctor's photo_url
    if (doctorData?.photo_url) {
      return { uri: doctorData.photo_url };
    }
    // Then try user's pfpimg
    if (userData?.pfpimg) {
      return { uri: userData.pfpimg };
    }
    // Finally, use default avatar
    return { uri: 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y' };
  };

  if (!doctorData || !userData) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading doctor profile...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#fff"
      />
      
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Doctor Dashboard</Text>
          <TouchableOpacity 
            style={styles.editButton}
            onPress={() => navigation.navigate('DoctorRegistration')}
          >
            <Ionicons name="create-outline" size={24} color="#333" />
          </TouchableOpacity>
        </View>

        <ScrollView 
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          bounces={Platform.OS === 'ios'}
        >
          {/* Profile Section */}
          <View style={styles.profileSection}>
            <View style={styles.profileHeader}>
              <View style={styles.profileImageContainer}>
                <Image 
                  source={getProfileImage()}
                  style={styles.profileImage} 
                />
                <TouchableOpacity 
                  style={styles.editImageButton}
                  onPress={() => {/* Add image upload functionality */}}
                >
                  <Ionicons name="camera" size={20} color="#FFF" />
                </TouchableOpacity>
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>{doctorData.name}</Text>
                <Text style={styles.specialization}>{doctorData.specialization}</Text>
                <View style={styles.statsRow}>
                  <Text style={styles.statText}>{doctorData.years_experience} years experience</Text>
                  <Text style={styles.statText}>{doctorData.age} years old</Text>
                </View>
              </View>
            </View>
            <Text style={styles.description}>{doctorData.description}</Text>
          </View>

          {/* Quick Actions Section */}
          <View style={styles.quickActionsSection}>
            <TouchableOpacity 
              style={styles.quickActionButton}
              onPress={() => navigation.navigate('Appointments')}
            >
              <Ionicons name="calendar" size={24} color="#1a237e" />
              <Text style={styles.quickActionText}>View Appointments</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.quickActionButton}
              onPress={() => navigation.navigate('DoctorRegistration')}
            >
              <Ionicons name="settings" size={24} color="#1a237e" />
              <Text style={styles.quickActionText}>Edit Profile</Text>
            </TouchableOpacity>
          </View>

          {/* Appointments Section */}
          <View style={styles.appointmentsSection}>
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tab, selectedTab === 'upcoming' && styles.activeTab]}
                onPress={() => setSelectedTab('upcoming')}
              >
                <Text style={[styles.tabText, selectedTab === 'upcoming' && styles.activeTabText]}>
                  Upcoming
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, selectedTab === 'past' && styles.activeTab]}
                onPress={() => setSelectedTab('past')}
              >
                <Text style={[styles.tabText, selectedTab === 'past' && styles.activeTabText]}>
                  Past
                </Text>
              </TouchableOpacity>
            </View>

            {/* Appointments List */}
            <View style={styles.appointmentsList}>
              {(selectedTab === 'upcoming' ? appointments.upcoming : appointments.past).map((appointment) => (
                <View key={appointment.id} style={styles.appointmentCard}>
                  <View style={styles.appointmentHeader}>
                    <Text style={styles.patientName}>{appointment.users.fullname}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(appointment.status) }]}>
                      <Text style={styles.statusText}>{appointment.status}</Text>
                    </View>
                  </View>
                  <Text style={styles.appointmentDateTime}>
                    {formatDateTime(appointment.appointment_datetime)}
                  </Text>
                  <Text style={styles.location}>{appointment.location}</Text>
                  {appointment.notes && (
                    <Text style={styles.notes}>{appointment.notes}</Text>
                  )}
                  {selectedTab === 'upcoming' && appointment.status === 'scheduled' && (
                    <View style={styles.actionButtons}>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.confirmButton]}
                        onPress={() => updateAppointmentStatus(appointment.id, 'confirmed')}
                      >
                        <Text style={styles.actionButtonText}>Confirm</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.cancelButton]}
                        onPress={() => updateAppointmentStatus(appointment.id, 'cancelled')}
                      >
                        <Text style={styles.actionButtonText}>Cancel</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ))}
            </View>
          </View>
        </ScrollView>

        <Navbar />
      </View>
    </SafeAreaView>
  );
};

const getStatusColor = (status) => {
  switch (status) {
    case 'scheduled':
      return '#f1c40f';
    case 'confirmed':
      return '#2ecc71';
    case 'cancelled':
      return '#e74c3c';
    case 'completed':
      return '#3498db';
    default:
      return '#95a5a6';
  }
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingBottom: 80,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  scrollView: {
    flex: 1,
  },
  profileSection: {
    padding: 20,
    backgroundColor: '#fff',
    marginBottom: 10,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  profileImageContainer: {
    marginRight: 15,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#3498db',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  specialization: {
    fontSize: 16,
    color: '#7f8c8d',
    marginBottom: 4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statText: {
    fontSize: 14,
    color: '#34495e',
  },
  description: {
    fontSize: 15,
    color: '#2c3e50',
    lineHeight: 22,
  },
  appointmentsSection: {
    padding: 20,
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  tabText: {
    fontSize: 16,
    color: '#7f8c8d',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#3498db',
  },
  appointmentsList: {
    gap: 15,
  },
  appointmentCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  patientName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  appointmentDateTime: {
    fontSize: 16,
    color: '#34495e',
    marginBottom: 5,
  },
  location: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 5,
  },
  notes: {
    fontSize: 14,
    color: '#2c3e50',
    fontStyle: 'italic',
    marginTop: 5,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 15,
  },
  actionButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
  },
  confirmButton: {
    backgroundColor: '#2ecc71',
  },
  cancelButton: {
    backgroundColor: '#e74c3c',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#666',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
  },
  editButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
  },
  editImageButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#1a237e',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  quickActionsSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  quickActionButton: {
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    width: '45%',
  },
  quickActionText: {
    marginTop: 8,
    color: '#1a237e',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default DoctorDashboardScreen; 