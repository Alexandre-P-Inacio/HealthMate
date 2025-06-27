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
      const upcoming = data.filter(apt => new Date(apt.appointment_datetime) > now && apt.status !== 'cancelled');
      const past = data.filter(apt => new Date(apt.appointment_datetime) <= now && apt.status !== 'cancelled');
      const cancelled = data.filter(apt => apt.status === 'cancelled');

      setAppointments({
        upcoming,
        past,
        cancelled
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
    // Priority: doctorData.pfpimg > userData.pfpimg > doctorData.photo_url > default avatar
    if (doctorData?.pfpimg) {
      // If it's base64, prefix correctly
      if (doctorData.pfpimg.startsWith('data:image')) {
        return { uri: doctorData.pfpimg };
      } else {
        return { uri: `data:image/png;base64,${doctorData.pfpimg}` };
      }
    }
    if (userData?.pfpimg) {
      if (userData.pfpimg.startsWith('data:image')) {
        return { uri: userData.pfpimg };
      } else {
        return { uri: `data:image/png;base64,${userData.pfpimg}` };
      }
    }
    if (doctorData?.photo_url) {
      return { uri: doctorData.photo_url };
    }
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
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f7fafd' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#f7fafd" />
      <View style={{ flex: 1 }}>
        {/* Minimal Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, backgroundColor: '#f7fafd' }}>
          <Text style={{ fontSize: 22, fontWeight: '700', color: '#222' }}>Doctor Dashboard</Text>
        </View>
        
        <ScrollView 
          style={{ flex: 1 }} 
          contentContainerStyle={{ 
            paddingBottom: 120, // Extra space for navbar
            flexGrow: 1 
          }} 
          showsVerticalScrollIndicator={false}
        >
          {/* Profile Card */}
          <View style={{ backgroundColor: '#fff', borderRadius: 18, marginHorizontal: 20, marginTop: 10, padding: 24, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 }}>
            <Image
              source={userData?.pfpimg ? { uri: `data:image/png;base64,${userData.pfpimg}` } : { uri: 'https://i.pravatar.cc/150?img=3' }}
              style={{ width: 96, height: 96, borderRadius: 48, marginBottom: 12 }}
            />
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#222', marginBottom: 2 }}>{doctorData.name}</Text>
            <Text style={{ fontSize: 15, color: '#6a7a8c', marginBottom: 6 }}>{doctorData.specialization}</Text>
            <Text style={{ fontSize: 13, color: '#8a99a8', marginBottom: 2 }}>{doctorData.years_experience} years of experience • {doctorData.age} years old</Text>
            {doctorData.description ? (
              <Text style={{ fontSize: 14, color: '#444', marginTop: 8, textAlign: 'center' }}>{doctorData.description}</Text>
            ) : null}
          </View>
          
          {/* Action Row */}
          <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 18, marginBottom: 10, gap: 18 }}>
            <TouchableOpacity onPress={() => navigation.navigate('AppointmentsScreen')} style={{ alignItems: 'center' }}>
              <Ionicons name="calendar-outline" size={28} color="#4a67e3" />
              <Text style={{ fontSize: 13, color: '#4a67e3', marginTop: 4 }}>Appointments</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('DoctorAvailability')} style={{ alignItems: 'center' }}>
              <Ionicons name="time-outline" size={28} color="#4a67e3" />
              <Text style={{ fontSize: 13, color: '#4a67e3', marginTop: 4 }}>Availability</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('DoctorRegistration', { doctorId: doctorData.id })} style={{ alignItems: 'center' }}>
              <Ionicons name="person-circle-outline" size={28} color="#4a67e3" />
              <Text style={{ fontSize: 13, color: '#4a67e3', marginTop: 4 }}>Edit Profile</Text>
            </TouchableOpacity>
          </View>
          
          {/* Appointments List */}
          <View style={{ marginHorizontal: 20, marginTop: 10, marginBottom: 20 }}>
            <Text style={{ fontSize: 17, fontWeight: '600', color: '#222', marginBottom: 10 }}>Appointments</Text>
            {(!appointments.upcoming?.length && !appointments.past?.length && !appointments.cancelled?.length) ? (
              <Text style={{ color: '#aaa', fontSize: 15, textAlign: 'center', marginTop: 30 }}>No appointments found.</Text>
            ) : (
              <>
                {appointments.upcoming?.length > 0 && (
                  <View style={{ marginBottom: 18 }}>
                    <Text style={{ fontSize: 15, color: '#4a67e3', fontWeight: '500', marginBottom: 6 }}>Upcoming</Text>
                    {appointments.upcoming.map((appointment) => (
                      <View key={appointment.id} style={{ backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 16, fontWeight: '600', color: '#222' }}>{appointment.users?.fullname || 'Patient'}</Text>
                          <Text style={{ fontSize: 13, color: '#6a7a8c', marginTop: 2 }}>{formatDateTime(appointment.appointment_datetime)}</Text>
                          <Text style={{ fontSize: 13, color: '#8a99a8', marginTop: 2 }}>{appointment.location}</Text>
                          {appointment.notes ? <Text style={{ fontSize: 13, color: '#888', marginTop: 2 }}>{appointment.notes}</Text> : null}
                        </View>
                        <View style={{ alignItems: 'flex-end', marginLeft: 12 }}>
                          <View style={{ backgroundColor: getStatusColor(appointment.status), borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 6 }}>
                            <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>{appointment.status}</Text>
                          </View>
                          {appointment.status === 'scheduled' && (
                            <View style={{ flexDirection: 'row', gap: 6 }}>
                              <TouchableOpacity onPress={() => updateAppointmentStatus(appointment.id, 'confirmed')} style={{ backgroundColor: '#2ecc71', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6, marginTop: 2 }}>
                                <Text style={{ color: '#fff', fontSize: 13, fontWeight: 'bold' }}>Confirm</Text>
                              </TouchableOpacity>
                              <TouchableOpacity onPress={() => updateAppointmentStatus(appointment.id, 'cancelled')} style={{ backgroundColor: '#e74c3c', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6, marginTop: 2 }}>
                                <Text style={{ color: '#fff', fontSize: 13, fontWeight: 'bold' }}>Cancel</Text>
                              </TouchableOpacity>
                            </View>
                          )}
                        </View>
                      </View>
                    ))}
                  </View>
                )}
                
                {appointments.past?.length > 0 && (
                  <View style={{ marginBottom: 18 }}>
                    <Text style={{ fontSize: 15, color: '#aaa', fontWeight: '500', marginBottom: 6 }}>Past</Text>
                    {appointments.past.map((appointment) => (
                      <View key={appointment.id} style={{ backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 16, fontWeight: '600', color: '#222' }}>{appointment.users?.fullname || 'Patient'}</Text>
                          <Text style={{ fontSize: 13, color: '#6a7a8c', marginTop: 2 }}>{formatDateTime(appointment.appointment_datetime)}</Text>
                          <Text style={{ fontSize: 13, color: '#8a99a8', marginTop: 2 }}>{appointment.location}</Text>
                          {appointment.notes ? <Text style={{ fontSize: 13, color: '#888', marginTop: 2 }}>{appointment.notes}</Text> : null}
                        </View>
                        <View style={{ alignItems: 'flex-end', marginLeft: 12 }}>
                          <View style={{ backgroundColor: getStatusColor(appointment.status), borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 6 }}>
                            <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>{appointment.status}</Text>
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
                
                {appointments.cancelled?.length > 0 && (
                  <View style={{ marginBottom: 30 }}>
                    <Text style={{ fontSize: 15, color: '#e74c3c', fontWeight: '500', marginBottom: 6 }}>Cancelled</Text>
                    {appointments.cancelled.map((appointment) => (
                      <View key={appointment.id} style={{ backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 16, fontWeight: '600', color: '#222' }}>{appointment.users?.fullname || 'Patient'}</Text>
                          <Text style={{ fontSize: 13, color: '#6a7a8c', marginTop: 2 }}>{formatDateTime(appointment.appointment_datetime)}</Text>
                          <Text style={{ fontSize: 13, color: '#8a99a8', marginTop: 2 }}>{appointment.location}</Text>
                          {appointment.notes ? <Text style={{ fontSize: 13, color: '#888', marginTop: 2 }}>{appointment.notes}</Text> : null}
                        </View>
                        <View style={{ alignItems: 'flex-end', marginLeft: 12 }}>
                          <View style={{ backgroundColor: getStatusColor(appointment.status), borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 6 }}>
                            <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>{appointment.status}</Text>
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </>
            )}
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
});

export default DoctorDashboardScreen; 