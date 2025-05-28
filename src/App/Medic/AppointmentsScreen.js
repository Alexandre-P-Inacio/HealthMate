import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Alert, SafeAreaView, Platform, StatusBar, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DoctorAppointmentService from '../../services/DoctorAppointmentService';
import DataUser from '../../../navigation/DataUser';
import Navbar from '../../Components/Navbar';

const AppointmentsScreen = ({ navigation }) => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [isMedic, setIsMedic] = useState(false);

  useEffect(() => {
    const currentUser = DataUser.getUserData();
    if (currentUser && currentUser.id) {
      setUserId(currentUser.id);
      setIsMedic(currentUser.role === 'medic');
    } else {
      Alert.alert('Error', 'User not logged in.');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (userId) {
      fetchAppointments(userId);
    }
  }, [userId]);

  const fetchAppointments = async (id) => {
    try {
      setLoading(true);
      const data = await DoctorAppointmentService.fetchUserAppointments(id);
      setAppointments(data);
    } catch (error) {
      Alert.alert('Error', 'Failed to load appointments.');
      console.error('Error fetching appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderAppointmentItem = ({ item }) => {
    const appointmentDate = new Date(item.appointment_datetime);
    return (
      <View style={styles.appointmentCard}>
        <Text style={styles.doctorName}>Dr. {item.doctors?.fullname || 'N/A'}</Text>
        <Text style={styles.appointmentDate}>Date: {appointmentDate.toDateString()}</Text>
        <Text style={styles.appointmentTime}>Time: {appointmentDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
        <Text style={styles.appointmentLocation}>Location: {item.location}</Text>
        {item.notes && <Text style={styles.appointmentNotes}>Notes: {item.notes}</Text>}
        <Text style={styles.appointmentStatus}>Status: {item.status}</Text>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3498db" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Your Appointments</Text>
          {isMedic && (
            <TouchableOpacity 
              style={styles.manageButton}
              onPress={() => navigation.navigate('DoctorDashboard')}
            >
              <Ionicons name="settings-outline" size={24} color="#FFF" />
            </TouchableOpacity>
          )}
        </View>

        {appointments.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={64} color="#bdc3c7" />
            <Text style={styles.noDataText}>No appointments scheduled.</Text>
            {isMedic && (
              <TouchableOpacity 
                style={styles.addButton}
                onPress={() => navigation.navigate('DoctorDashboard')}
              >
                <Text style={styles.addButtonText}>Manage Schedule</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <FlatList
            data={appointments}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderAppointmentItem}
            contentContainerStyle={styles.listContainer}
          />
        )}

        <Navbar navigation={navigation} />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#6A8DFD',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
    backgroundColor: '#F5F6FA',
    paddingBottom: 80,
  },
  header: {
    backgroundColor: '#6A8DFD',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerRight: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noDataText: {
    fontSize: 18,
    color: '#7f8c8d',
    marginTop: 10,
  },
  listContainer: {
    paddingHorizontal: 15,
    paddingTop: 10,
    paddingBottom: 20,
  },
  appointmentCard: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  doctorName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3498db',
    marginBottom: 5,
  },
  appointmentDate: {
    fontSize: 15,
    color: '#555',
    marginBottom: 3,
  },
  appointmentTime: {
    fontSize: 15,
    color: '#555',
    marginBottom: 3,
  },
  appointmentLocation: {
    fontSize: 15,
    color: '#555',
    marginBottom: 3,
  },
  appointmentNotes: {
    fontSize: 14,
    color: '#7f8c8d',
    fontStyle: 'italic',
    marginTop: 5,
  },
  appointmentStatus: {
    fontSize: 15,
    fontWeight: 'bold',
    marginTop: 5,
    color: '#2ecc71',
  },
  manageButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
  },
  addButton: {
    backgroundColor: '#6A8DFD',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    marginTop: 20,
  },
  addButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AppointmentsScreen; 