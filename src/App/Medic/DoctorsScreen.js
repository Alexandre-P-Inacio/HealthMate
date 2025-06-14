import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  StyleSheet, 
  TextInput, 
  Alert,
  Image,
  SafeAreaView,
  Platform,
  StatusBar,
  ActivityIndicator,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import supabase from '../../../supabase';
import DataUser from '../../../navigation/DataUser';
import DoctorAppointmentService from '../../services/DoctorAppointmentService';
import Navbar from '../../Components/Navbar';
import DateTimePicker from '@react-native-community/datetimepicker';

const DoctorsScreen = ({ navigation }) => {
  const [role, setRole] = useState('');
  const [list, setList] = useState([]);
  const [medics, setMedics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [appointmentModalVisible, setAppointmentModalVisible] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [appointmentDate, setAppointmentDate] = useState(new Date());
  const [appointmentTime, setAppointmentTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [appointmentLocation, setAppointmentLocation] = useState('');
  const [appointmentNotes, setAppointmentNotes] = useState('');

  useEffect(() => {
    const fetchRoleAndData = async () => {
      setLoading(true);
      const userId = DataUser.getUserData()?.id;
      if (!userId) {
        setLoading(false);
        return;
      }

      // Fetch user role
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single();

      if (userError) {
        Alert.alert('Error', 'Could not fetch user role');
        setLoading(false);
        return;
      }
      setRole(userData.role);

      if (userData.role === 'doctor') {
        // Fetch patients for this doctor
        const { data: patients, error: patientsError } = await supabase
          .from('users')
          .select('id, fullname, email, pfpimg')
          .eq('assigned_doctor_id', userId);
        if (patientsError) {
          console.error('Error fetching patients:', patientsError);
          Alert.alert('Error', 'Could not fetch patients');
        } else {
          setList(patients);
        }
      } else {
        // Fetch all users with role 'medic'
        const { data: medicsData, error: medicsError } = await supabase
          .from('users')
          .select('id, fullname, email, pfpimg')
          .filter('role', 'eq', 'medic');

        if (medicsError) {
          console.error('Error fetching medics:', medicsError);
          Alert.alert('Error', 'Could not fetch medics');
          setLoading(false);
          return;
        }

        // Fetch all doctor details
        const { data: doctorsData, error: doctorsError } = await supabase
          .from('doctors')
          .select('id, specialization, years_experience, description');

        if (doctorsError) {
          console.error('Error fetching doctor details:', doctorsError);
          Alert.alert('Error', 'Could not fetch doctor details');
          setLoading(false);
          return;
        }

        // Combine medic data with doctor details
        const medicsWithDetails = medicsData.map(medic => {
          const doctorDetail = doctorsData.find(doc => doc.id === medic.id);
          return {
            ...medic,
            specialization: doctorDetail ? doctorDetail.specialization : 'Nao encontrado',
            years_experience: doctorDetail ? doctorDetail.years_experience : 'Nao encontrado',
            description: doctorDetail ? doctorDetail.description : 'No profile description available.',
          };
        });

        setMedics(medicsWithDetails);
        console.log('Fetched medics with doctor details:', medicsWithDetails);
        }

      setLoading(false);
    };
    fetchRoleAndData();
  }, []);

  const handleAddNote = async () => {
    if (!selectedPatient || !note) return;
    const userId = DataUser.getUserData()?.id;
    const { error } = await supabase
      .from('doctor_notes')
      .insert({ patient_id: selectedPatient.id, doctor_id: userId, note });
    if (error) {
      Alert.alert('Error', 'Could not add note');
    } else {
      Alert.alert('Success', 'Note added');
      setNote('');
      setSelectedPatient(null);
    }
  };

  const handleAssignDoctor = async (doctorId) => {
    const userId = DataUser.getUserData()?.id;
    if (!userId) return;
    const { error } = await supabase
      .from('users')
      .update({ assigned_doctor_id: doctorId })
      .eq('id', userId);
    if (error) {
      Alert.alert('Error', 'Could not assign doctor');
    } else {
      Alert.alert('Success', 'Doctor assigned!');
    }
  };

  const openScheduleModal = (doctor) => {
    setSelectedDoctor(doctor);
    setAppointmentModalVisible(true);
  };

  const handleDateChange = (event, selectedDate) => {
    const currentDate = selectedDate || appointmentDate;
    setShowDatePicker(Platform.OS === 'ios');
    setAppointmentDate(currentDate);
  };

  const handleTimeChange = (event, selectedTime) => {
    const currentTime = selectedTime || appointmentTime;
    setShowTimePicker(Platform.OS === 'ios');
    setAppointmentTime(currentTime);
  };

  const handleScheduleAppointment = async () => {
    const userId = DataUser.getUserData()?.id;
    if (!userId || !selectedDoctor || !appointmentDate || !appointmentTime || !appointmentLocation.trim()) {
      Alert.alert('Error', 'Please fill all required fields.');
      return;
    }

    try {
      const appointmentDateTime = new Date(appointmentDate);
      appointmentDateTime.setHours(appointmentTime.getHours(), appointmentTime.getMinutes(), 0, 0);

      const appointmentData = {
        user_id: userId,
        doctor_id: selectedDoctor.id,
        appointment_datetime: appointmentDateTime.toISOString(),
        location: appointmentLocation.trim(),
        notes: appointmentNotes.trim(),
        status: 'scheduled', // Default status
      };

      await DoctorAppointmentService.createAppointment(appointmentData);
      Alert.alert('Success', 'Appointment scheduled successfully!');
      // Clear form and close modal
      setAppointmentModalVisible(false);
      setSelectedDoctor(null);
      setAppointmentDate(new Date());
      setAppointmentTime(new Date());
      setAppointmentLocation('');
      setAppointmentNotes('');
      // Optionally refresh appointments list if you implement one on this screen

    } catch (error) {
      Alert.alert('Error', 'Failed to schedule appointment.');
      console.error('Error scheduling appointment:', error);
    }
  };

  const renderDoctorCard = ({ item }) => {
    const profileImage = item.pfpimg
      ? { uri: `data:image/png;base64,${item.pfpimg}` }
      : { uri: 'https://i.pravatar.cc/150?img=3' };

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => {
          if (role === 'doctor') setSelectedPatient(item);
          if (role !== 'doctor') handleAssignDoctor(item.id);
        }}
      >
        <View style={styles.cardHeader}>
          <Image source={profileImage} style={styles.profileImage} />
          <View style={styles.doctorInfo}>
            <Text style={styles.name}>{item.fullname}</Text>
            {role === 'doctor' ? (
               <Text style={styles.specialization}>Patient</Text>
            ) : (
               <Text style={styles.specialization}>{item.specialization || 'Nao encontrado'}</Text>
            )}
          </View>
        </View>
        <View style={styles.cardBody}>
          <View style={styles.infoRow}>
            <Ionicons name="mail-outline" size={20} color="#6A8DFD" />
            <Text style={styles.email}>{item.email}</Text>
          </View>
          {role === 'doctor' && (
            <TouchableOpacity 
              style={styles.viewProfileButton}
              onPress={() => navigation.navigate('PatientProfile', { patientId: item.id })}
            >
              <Text style={styles.viewProfileText}>View Profile</Text>
              <Ionicons name="chevron-forward" size={20} color="#6A8DFD" />
            </TouchableOpacity>
          )}
          {role !== 'doctor' && (item.specialization !== 'Nao encontrado' || item.years_experience !== 'Nao encontrado') && (
            <View style={styles.infoRow}>
              <Ionicons name="medical-outline" size={20} color="#6A8DFD" />
              <Text style={styles.email}>Spec: {item.specialization}</Text>
            </View>
          )}
          {role !== 'doctor' && (item.specialization !== 'Nao encontrado' || item.years_experience !== 'Nao encontrado') && (
            <View style={styles.infoRow}>
              <Ionicons name="star-outline" size={20} color="#6A8DFD" />
              <Text style={styles.email}>Exp: {item.years_experience}</Text>
            </View>
          )}
          <TouchableOpacity onPress={() => navigation.navigate('AppointmentsScreen', { userId: item.id })} style={{marginLeft: 8}}>
            <Ionicons name="calendar-outline" size={24} color="#3498db" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderMedicItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.doctorCard} 
      onPress={() => navigation.navigate('DoctorDetailsScreen', { doctor: item })}
    >
      <Image 
        source={item.pfpimg ? { uri: `data:image/png;base64,${item.pfpimg}` } : { uri: 'https://img.icons8.com/ios-filled/100/3498db/doctor-male.png' }}
        style={styles.doctorImage}
      />
      <View style={styles.doctorInfo}>
        <Text style={styles.doctorName}>{item.fullname}</Text>
        <Text style={styles.doctorSpecialization}>Spec: {item.specialization}</Text>
        <Text style={styles.doctorDetails}>Exp: {item.years_experience} years</Text>
      </View>
      {role !== 'doctor' && (
         <TouchableOpacity onPress={() => handleAssignDoctor(item.id)} style={styles.assignButton}>
            <Text style={styles.assignButtonText}>Assign Me</Text>
         </TouchableOpacity>
      )}
      <TouchableOpacity onPress={() => navigation.navigate('AppointmentsScreen', { userId: item.id })} style={{marginLeft: 8}}>
        <Ionicons name="calendar-outline" size={24} color="#3498db" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

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
        <View style={{flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#3498db'}}>
          <TouchableOpacity onPress={() => navigation.navigate('AccountScreen')} style={{marginRight: 16}}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={{color: '#fff', fontSize: 20, fontWeight: 'bold', flex: 1}}>Doctors & Patients</Text>
          {role === 'doctor' && (
            <TouchableOpacity onPress={() => navigation.navigate('DoctorAppointmentRequest')} style={{marginLeft: 8}}>
              <Ionicons name="add-circle" size={28} color="#fff" />
            </TouchableOpacity>
          )}
        </View>

        {role === 'doctor' ? (
        <FlatList
          data={list}
          keyExtractor={item => item.id.toString()}
          renderItem={renderDoctorCard}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={70} color="#6A8DFD" />
                <Text style={styles.emptyText}>No patients found.</Text>
              </View>
            }
          />
        ) : (
          <FlatList
            data={medics}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderMedicItem}
            contentContainerStyle={styles.listContainer}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="people-outline" size={64} color="#bdc3c7" />
                <Text style={styles.noDataText}>No medics available</Text>
            </View>
          }
        />
        )}

        {role === 'doctor' && selectedPatient && (
          <View style={styles.noteBox}>
            <Text style={styles.noteTitle}>Add Note for {selectedPatient.fullname}</Text>
            <TextInput
              style={styles.input}
              value={note}
              onChangeText={setNote}
              placeholder="Enter note..."
              multiline
            />
            <TouchableOpacity style={styles.addButton} onPress={handleAddNote}>
              <Text style={styles.addButtonText}>Add Note</Text>
            </TouchableOpacity>
          </View>
        )}

        <Modal
          animationType="slide"
          transparent={true}
          visible={appointmentModalVisible}
          onRequestClose={() => setAppointmentModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Schedule Appointment</Text>

              {selectedDoctor && (
                <View style={styles.selectedDoctorInfo}>
                  <Text style={styles.selectedDoctorName}>Dr. {selectedDoctor.fullname}</Text>
                  <Text style={styles.selectedDoctorSpecialization}>{selectedDoctor.specialization}</Text>
                </View>
              )}

              <Text style={styles.inputLabel}>Date</Text>
              <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.datePickerButton}>
                <Ionicons name="calendar-outline" size={24} color="#333" />
                <Text style={styles.datePickerText}>
                  {appointmentDate.toDateString()}
                </Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={appointmentDate}
                  mode="date"
                  display="default"
                  onChange={handleDateChange}
                />
              )}

              <Text style={styles.inputLabel}>Time</Text>
              <TouchableOpacity onPress={() => setShowTimePicker(true)} style={styles.datePickerButton}>
                <Ionicons name="time-outline" size={24} color="#333" />
                <Text style={styles.datePickerText}>
                  {appointmentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </TouchableOpacity>
              {showTimePicker && (
                <DateTimePicker
                  value={appointmentTime}
                  mode="time"
                  display="default"
                  onChange={handleTimeChange}
                />
              )}

              <Text style={styles.inputLabel}>Location</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter location (e.g., Clinic address, Online link)"
                value={appointmentLocation}
                onChangeText={setAppointmentLocation}
              />

              <Text style={styles.inputLabel}>Notes (Optional)</Text>
              <TextInput
                style={[styles.input, { height: 100 }]}
                placeholder="Any specific notes for the doctor?"
                value={appointmentNotes}
                onChangeText={setAppointmentNotes}
                multiline
              />

              <TouchableOpacity style={styles.scheduleButton} onPress={handleScheduleAppointment}>
                <Text style={styles.scheduleButtonText}>Schedule Appointment</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.cancelButton} onPress={() => setAppointmentModalVisible(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

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
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    width: 40,
  },
  listContainer: {
    padding: 16,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  profileImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 12,
  },
  doctorInfo: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3142',
    marginBottom: 4,
  },
  specialization: {
    fontSize: 14,
    color: '#6A8DFD',
    fontWeight: '500',
  },
  cardBody: {
    borderTopWidth: 1,
    borderTopColor: '#E8ECF4',
    paddingTop: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  email: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  viewProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F5F7FF',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  viewProfileText: {
    color: '#6A8DFD',
    fontWeight: '600',
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
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
  },
  noteBox: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 16,
    margin: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D3142',
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#F5F7FF',
    borderRadius: 8,
    padding: 12,
    minHeight: 80,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E8ECF4',
  },
  addButton: {
    backgroundColor: '#6A8DFD',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  doctorCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  doctorImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 15,
  },
  doctorName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  doctorSpecialization: {
    fontSize: 15,
    color: '#3498db',
    marginTop: 4,
  },
  doctorDetails: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 2,
  },
  noDataText: {
    fontSize: 18,
    color: '#7f8c8d',
    marginTop: 10,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#2c3e50',
  },
  selectedDoctorInfo: {
    marginBottom: 20,
    alignItems: 'center',
  },
  selectedDoctorName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3498db',
  },
  selectedDoctorSpecialization: {
    fontSize: 16,
    color: '#7f8c8d',
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#2c3e50',
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  datePickerText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#333',
  },
  scheduleButton: {
    backgroundColor: '#2ecc71',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  scheduleButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: '#e74c3c',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  assignButton: {
    backgroundColor: '#6A8DFD',
    padding: 10,
    borderRadius: 5,
    marginLeft: 'auto',
  },
  assignButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default DoctorsScreen; 