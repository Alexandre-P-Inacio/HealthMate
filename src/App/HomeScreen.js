import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert, ScrollView, Image, TouchableOpacity, SafeAreaView, Platform, StatusBar, ActivityIndicator, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import supabase from '../../supabase';
import Navbar from '../Components/Navbar';
import * as Calendar from 'expo-calendar';
import DataUser from '../../navigation/DataUser';

const HomeScreen = () => {
  const [userData, setUserData] = useState({
    fullname: '',
    profilePicture: ''
  });
  const [medications, setMedications] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [calendarId, setCalendarId] = useState(null);
  const [events, setEvents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentHour, setCurrentHour] = useState(new Date().getHours());
  const [isLoading, setIsLoading] = useState(true);
  const [missedMedication, setMissedMedication] = useState(null);
  const [showMedicationModal, setShowMedicationModal] = useState(false);

  useEffect(() => {
    fetchUserData();
    requestCalendarPermissions();
    checkMissedMedications();
    
    const interval = setInterval(() => {
      setCurrentHour(new Date().getHours());
      checkMissedMedications();
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (calendarId) {
      fetchEvents(calendarId);
    }
  }, [selectedDate, calendarId]);

  const requestCalendarPermissions = async () => {
    const { status } = await Calendar.requestCalendarPermissionsAsync();
    if (status === 'granted') {
      getCalendars();
    } else {
      Alert.alert('Calendar permission not granted');
    }
  };

  const fetchUserData = async () => {
    try {
      const userId = DataUser.getUserData()?.id;
      
      if (!userId) {
        console.error('User ID not found');
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;

      if (data) {
        setUserData({
          fullname: data.fullname || 'User',
          profilePicture: data.pfpimg ? `data:image/jpeg;base64,${data.pfpimg}` : null
        });
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMedications = async () => {
    try {
      const { data, error } = await supabase.from('pills_warning').select('*');
      if (error) throw error;
      setMedications(data || []);
      return data || [];
    } catch (error) {
      console.error('Error fetching medications:', error);
      return [];
    }
  };

  const fetchDoctors = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'doctor')
        .limit(2);

      if (error) throw error;
      setDoctors(data || []);
    } catch (error) {
      console.error('Error fetching doctors:', error);
    }
  };

  const getCalendars = async () => {
    try {
      const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      if (calendars.length > 0) {
        const defaultCalendar = calendars.find(cal => 
          cal.accessLevel === Calendar.CalendarAccessLevel.OWNER && 
          cal.source.name === 'Default'
        ) || calendars[0];
        
        setCalendarId(defaultCalendar.id);
        fetchEvents(defaultCalendar.id);
      } else {
        const newCalendarId = await createCalendar();
        setCalendarId(newCalendarId);
      }
    } catch (error) {
      console.error('Error getting calendars:', error);
      Alert.alert('Error', 'Failed to access calendar');
    }
  };

  const createCalendar = async () => {
    const defaultCalendarSource =
      Platform.OS === 'ios'
        ? await Calendar.getDefaultCalendarAsync()
        : { isLocalAccount: true, name: 'Medication Calendar' };

    const newCalendarId = await Calendar.createCalendarAsync({
      title: 'Medication Calendar',
      color: '#6A8DFD',
      entityType: Calendar.EntityTypes.EVENT,
      sourceId: defaultCalendarSource.id,
      source: defaultCalendarSource,
      name: 'medicationApp',
      ownerAccount: 'personal',
      accessLevel: Calendar.CalendarAccessLevel.OWNER,
    });
    
    return newCalendarId;
  };

  const fetchEvents = async (calendarId) => {
    try {
      if (!calendarId) {
        console.error('No calendar ID available');
        return;
      }

      const startDate = new Date(selectedDate);
      startDate.setHours(0, 0, 0, 0);

      const endDate = new Date(selectedDate);
      endDate.setHours(23, 59, 59, 999);

      const events = await Calendar.getEventsAsync([calendarId], startDate, endDate);
      setEvents(events);
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  const checkMissedMedications = async () => {
    const medsList = await fetchMedications();
    const now = new Date();
    
    for (const med of medsList) {
      if (med.data_inicio) {
        const medTime = new Date(med.data_inicio);
        
        if (medTime.getDate() === now.getDate() && 
            medTime.getMonth() === now.getMonth() && 
            medTime.getFullYear() === now.getFullYear() && 
            medTime.getHours() < now.getHours()) {
            
          const { data } = await supabase
            .from('medication_confirmations')
            .select('*')
            .eq('medication_id', med.id)
            .eq('confirmation_date', now.toISOString().split('T')[0])
            .single();
            
          if (!data) {
            setMissedMedication(med);
            setShowMedicationModal(true);
            break;
          }
        }
      }
    }
  };

  const handleMedicationResponse = async (taken) => {
    if (missedMedication) {
      try {
        await supabase.from('medication_confirmations').insert({
          medication_id: missedMedication.id,
          taken: taken,
          confirmation_date: new Date().toISOString().split('T')[0],
          confirmation_time: new Date().toISOString()
        });
        
        if (taken) {
          await supabase
            .from('pills_warning')
            .update({ last_taken: new Date().toISOString() })
            .eq('id', missedMedication.id);
        }
        
        Alert.alert(
          'Thank you!', 
          taken ? 'We recorded that you took your medication.' : 'We recorded that you missed your medication.'
        );
        
      } catch (error) {
        console.error('Error recording medication response:', error);
      }
    }
    
    setShowMedicationModal(false);
    setMissedMedication(null);
  };

  const getNextDays = (numDays) => {
    const today = new Date();
    return Array.from({ length: numDays }, (_, i) => {
      const nextDay = new Date(today);
      nextDay.setDate(today.getDate() + i);
      return nextDay;
    });
  };

  const getVisibleHours = () => {
    const hours = [];
    for (let i = currentHour - 3; i <= currentHour + 3; i++) {
      const hour = i < 0 ? i + 24 : i >= 24 ? i - 24 : i;
      hours.push(hour);
    }
    return hours.sort((a, b) => a - b);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6A8DFD" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
    <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {userData?.profilePicture ? (
              <Image 
                source={{ uri: userData.profilePicture }}
                style={styles.profilePicture}
              />
            ) : (
              <View style={[styles.profilePicture, styles.profilePlaceholder]}>
                <Text style={styles.profilePlaceholderText}>
                  {userData?.fullname?.charAt(0) || 'U'}
                </Text>
              </View>
            )}
            <View style={styles.headerTextContainer}>
              <Text style={styles.welcomeText}>Welcome back</Text>
              <Text style={styles.userNameText} numberOfLines={1}>
                {userData?.fullname || 'User'}
              </Text>
            </View>
          </View>
          <TouchableOpacity style={styles.notificationButton}>
            <Ionicons name="notifications-outline" size={24} color="white" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.calendarContainer}>
            <Text style={styles.calendarTitle}>Your Schedule</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.dayScrollView}
            >
              <View style={styles.daySelector}>
                {getNextDays(5).map((date, index) => (
                  <TouchableOpacity 
                    key={index} 
                    style={[
                      styles.dayButton,
                      date.toDateString() === selectedDate.toDateString() && styles.selectedDayButton
                    ]} 
                    onPress={() => setSelectedDate(date)}
                  >
                    <Text style={[
                      styles.daySubText,
                      date.toDateString() === selectedDate.toDateString() && styles.selectedDayText
                    ]}>
                      {date.toLocaleString('en-US', { weekday: 'short' }).toUpperCase()}
                    </Text>
                    <Text style={[
                      styles.dayText,
                      date.toDateString() === selectedDate.toDateString() && styles.selectedDayText
                    ]}>
                      {date.getDate()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <ScrollView 
              style={styles.hourlySchedule}
              showsVerticalScrollIndicator={false}
            >
              {getVisibleHours().map((hour) => (
                <View key={hour} style={[
                  styles.hourRow,
                  hour === currentHour && styles.currentHourRow
                ]}>
                  <Text style={[
                    styles.hourText,
                    hour === currentHour && styles.currentHourText
                  ]}>
                    {hour.toString().padStart(2, '0')}:00
                  </Text>
                  <View style={styles.timelineContainer}>
                    {events
                      .filter(event => new Date(event.startDate).getHours() === hour)
                      .map((event, idx) => (
                        <View key={idx} style={styles.eventCard}>
                          <Text style={styles.eventTitle}>{event.title}</Text>
                          <Text style={styles.eventTime}>
                            {new Date(event.startDate).toLocaleTimeString([], { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </Text>
                        </View>
                      ))}
                  </View>
                </View>
              ))}
            </ScrollView>
      </View>

          <View style={styles.doctorsContainer}>
            <Text style={styles.sectionTitle}>Your Doctors</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.doctorsScrollView}
            >
              {doctors.length > 0 ? (
                doctors.map((doctor) => (
                  <View key={doctor.id} style={styles.doctorCard}>
                    <Image 
                      source={{ uri: doctor.profilePicture || 'https://randomuser.me/api/portraits/men/1.jpg' }} 
                      style={styles.doctorImage} 
                    />
                    <Text style={styles.doctorName}>{doctor.fullname}</Text>
                    <Text style={styles.doctorSpecialty}>{doctor.specialty || 'Specialty'}</Text>
                  </View>
                ))
              ) : (
                <View style={styles.doctorCard}>
                  <View style={styles.doctorImagePlaceholder}>
                    <Ionicons name="medical" size={24} color="#6A8DFD" />
                  </View>
                  <Text style={styles.doctorName}>No doctors</Text>
                  <Text style={styles.doctorSpecialty}>Add a doctor</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </ScrollView>

        <Modal
          animationType="slide"
          transparent={true}
          visible={showMedicationModal}
          onRequestClose={() => setShowMedicationModal(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Medication Reminder</Text>
              
              <Text style={styles.modalText}>
                Did you take your medication: {missedMedication?.nome}?
              </Text>
              
              <Text style={styles.medicationInfo}>
                Scheduled for: {missedMedication ? new Date(missedMedication.data_inicio).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'}) : ''}
              </Text>
              
              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.noButton]} 
                  onPress={() => handleMedicationResponse(false)}
                >
                  <Text style={styles.buttonText}>No</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.modalButton, styles.yesButton]} 
                  onPress={() => handleMedicationResponse(true)}
                >
                  <Text style={styles.buttonText}>Yes</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

      <Navbar />
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  profilePicture: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  profilePlaceholder: {
    backgroundColor: '#E8ECF4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profilePlaceholderText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6A8DFD',
  },
  headerTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  welcomeText: {
    fontSize: 12,
    color: '#E8ECF4',
    marginBottom: 2,
  },
  userNameText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  notificationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 15,
  },
  calendarContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 15,
    padding: 12,
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  calendarTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D3142',
    marginBottom: 10,
  },
  dayScrollView: {
    marginBottom: 10,
  },
  daySelector: {
    flexDirection: 'row',
    paddingVertical: 5,
  },
  dayButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 55,
    height: 75,
    backgroundColor: '#ffffff',
    borderRadius: 15,
    marginRight: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    borderWidth: 1,
    borderColor: '#E8ECF4',
  },
  selectedDayButton: {
    backgroundColor: '#6A8DFD',
    borderColor: '#6A8DFD',
  },
  dayText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D3142',
  },
  daySubText: {
    fontSize: 12,
    color: '#9BA3B7',
  },
  selectedDayText: {
    color: '#ffffff',
  },
  hourlySchedule: {
    maxHeight: 300,
  },
  hourRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F5',
  },
  currentHourRow: {
    backgroundColor: '#F5F7FF',
    borderRadius: 8,
    marginHorizontal: -8,
    paddingHorizontal: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#6A8DFD',
  },
  hourText: {
    width: 55,
    fontSize: 14,
    color: '#9BA3B7',
    fontWeight: '500',
  },
  currentHourText: {
    color: '#6A8DFD',
    fontWeight: 'bold',
  },
  timelineContainer: {
    flex: 1,
    marginLeft: 10,
  },
  eventCard: {
    backgroundColor: '#F5F7FF',
    padding: 12,
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#6A8DFD',
    marginBottom: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D3142',
  },
  eventTime: {
    fontSize: 12,
    color: '#6A8DFD',
    marginTop: 4,
  },
  doctorsContainer: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D3142',
    marginBottom: 12,
  },
  doctorsScrollView: {
    paddingVertical: 5,
  },
  doctorCard: {
    backgroundColor: '#ffffff',
    padding: 15,
    borderRadius: 15,
    marginRight: 12,
    alignItems: 'center',
    width: 130,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    borderWidth: 1,
    borderColor: '#F0F0F5',
  },
  doctorImage: {
    width: 65,
    height: 65,
    borderRadius: 32.5,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#F0F0F5',
  },
  doctorImagePlaceholder: {
    width: 65,
    height: 65,
    borderRadius: 32.5,
    backgroundColor: '#F5F7FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  doctorName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2D3142',
    textAlign: 'center',
  },
  doctorSpecialty: {
    fontSize: 12,
    color: '#9BA3B7',
    marginTop: 4,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F6FA',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 25,
    width: '85%',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2D3142',
    marginBottom: 15,
  },
  modalText: {
    fontSize: 16,
    color: '#2D3142',
    marginBottom: 10,
    textAlign: 'center',
  },
  medicationInfo: {
    fontSize: 14,
    color: '#6A8DFD',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  modalButton: {
    padding: 12,
    borderRadius: 10,
    width: '45%',
    alignItems: 'center',
  },
  yesButton: {
    backgroundColor: '#6A8DFD',
  },
  noButton: {
    backgroundColor: '#E74C3C',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default HomeScreen;
