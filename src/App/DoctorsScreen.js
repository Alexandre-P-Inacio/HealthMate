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
  StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import supabase from '../../supabase';
import DataUser from '../../navigation/DataUser';

const DoctorsScreen = ({ navigation }) => {
  const [role, setRole] = useState('');
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);

  useEffect(() => {
    const fetchRoleAndList = async () => {
      setLoading(true);
      const userId = DataUser.getUserData()?.id;
      if (!userId) return;
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
          Alert.alert('Error', 'Could not fetch patients');
        } else {
          setList(patients);
        }
      } else {
        // Fetch all doctors (role 'medic')
        const { data: doctors, error: doctorsError } = await supabase
          .from('users')
          .select('id, fullname, email, pfpimg')
          .filter('role', 'eq', 'medic');
        if (doctorsError) {
          console.error('Error fetching doctors:', doctorsError);
          setList([]);
        } else {
          console.log('Fetched doctors:', doctors);
          setList(doctors);
        }
      }
      setLoading(false);
    };
    fetchRoleAndList();
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
            <Text style={styles.specialization}>Medical Professional</Text>
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
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
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
          <Text style={styles.headerTitle}>
            {role === 'doctor' ? 'My Patients' : 'Available Doctors'}
          </Text>
          <View style={styles.headerRight} />
        </View>

        <FlatList
          data={list}
          keyExtractor={item => item.id.toString()}
          renderItem={renderDoctorCard}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={70} color="#6A8DFD" />
              <Text style={styles.emptyText}>No {role === 'doctor' ? 'patients' : 'doctors'} found.</Text>
            </View>
          }
        />

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
  loadingText: {
    fontSize: 16,
    color: '#FFF',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    marginTop: 50,
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
});

export default DoctorsScreen; 