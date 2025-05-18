import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, Alert } from 'react-native';
import supabase from '../../supabase';
import DataUser from '../../navigation/DataUser';

const DoctorsScreen = () => {
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
          .select('id, fullname, email')
          .eq('assigned_doctor_id', userId);
        if (patientsError) {
          Alert.alert('Error', 'Could not fetch patients');
        } else {
          setList(patients);
        }
      } else {
        // Fetch all doctors (role 'doctor' or 'medic')
        const { data: doctors, error: doctorsError } = await supabase
          .from('users')
          .select('id, fullname, email')
          .in('role', ['doctor', 'medic']);
        if (doctorsError) {
          setList([]);
        } else {
          setList(doctors);
        }
      }
      setLoading(false);
    };
    fetchRoleAndList();
  }, []);

  const handleAddNote = async () => {
    if (!selectedPatient || !note) return;
    // You may want to create a new table doctor_notes(patient_id, doctor_id, note, created_at)
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

  if (loading) return <View style={styles.center}><Text>Loading...</Text></View>;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{role === 'doctor' ? 'My Patients' : 'All Doctors'}</Text>
      <FlatList
        data={list}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => {
              if (role === 'doctor') setSelectedPatient(item);
              if (role !== 'doctor') handleAssignDoctor(item.id);
            }}
          >
            <Text style={styles.name}>{item.fullname}</Text>
            <Text style={styles.email}>{item.email}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No records found.</Text>}
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
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 20 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 20 },
  card: { backgroundColor: '#f0f9ff', padding: 16, borderRadius: 10, marginBottom: 12 },
  name: { fontSize: 18, fontWeight: 'bold' },
  email: { fontSize: 14, color: '#555' },
  empty: { textAlign: 'center', color: '#aaa', marginTop: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  noteBox: { backgroundColor: '#f8f8f8', padding: 16, borderRadius: 10, marginTop: 20 },
  noteTitle: { fontWeight: 'bold', marginBottom: 8 },
  input: { backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#ddd', padding: 8, minHeight: 60, marginBottom: 10 },
  addButton: { backgroundColor: '#3498db', borderRadius: 8, padding: 12, alignItems: 'center' },
  addButtonText: { color: '#fff', fontWeight: 'bold' },
});

export default DoctorsScreen; 