import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, Alert } from 'react-native';
import supabase from '../../supabase';
import DataUser from '../../navigation/DataUser';

const AppointmentsScreen = () => {
  const [role, setRole] = useState('');
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newAppointment, setNewAppointment] = useState({ patientId: '', date: '', time: '', reason: '' });

  useEffect(() => {
    const fetchRoleAndAppointments = async () => {
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
        // Fetch appointments for this doctor
        const { data: appts, error: apptError } = await supabase
          .from('appointments')
          .select('id, patient_id, date, time, reason, users(fullname)')
          .eq('doctor_id', userId)
          .order('date', { ascending: true });
        setAppointments(appts || []);
      } else {
        // Fetch appointments for this patient
        const { data: appts, error: apptError } = await supabase
          .from('appointments')
          .select('id, doctor_id, date, time, reason, users(fullname)')
          .eq('patient_id', userId)
          .order('date', { ascending: true });
        setAppointments(appts || []);
      }
      setLoading(false);
    };
    fetchRoleAndAppointments();
  }, []);

  const handleAddAppointment = async () => {
    const userId = DataUser.getUserData()?.id;
    if (!newAppointment.patientId || !newAppointment.date || !newAppointment.time) {
      Alert.alert('Error', 'Fill all fields');
      return;
    }
    const { error } = await supabase
      .from('appointments')
      .insert({
        doctor_id: userId,
        patient_id: newAppointment.patientId,
        date: newAppointment.date,
        time: newAppointment.time,
        reason: newAppointment.reason
      });
    if (error) {
      Alert.alert('Error', 'Could not add appointment');
    } else {
      Alert.alert('Success', 'Appointment added');
      setNewAppointment({ patientId: '', date: '', time: '', reason: '' });
    }
  };

  if (loading) return <View style={styles.center}><Text>Loading...</Text></View>;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Appointments</Text>
      <FlatList
        data={appointments}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.name}>{item.users?.fullname || 'Unknown'}</Text>
            <Text style={styles.detail}>Date: {item.date} Time: {item.time}</Text>
            <Text style={styles.detail}>Reason: {item.reason}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No appointments found.</Text>}
      />
      {role === 'doctor' && (
        <View style={styles.addBox}>
          <Text style={styles.addTitle}>Add Appointment</Text>
          <TextInput
            style={styles.input}
            value={newAppointment.patientId}
            onChangeText={t => setNewAppointment({ ...newAppointment, patientId: t })}
            placeholder="Patient ID"
          />
          <TextInput
            style={styles.input}
            value={newAppointment.date}
            onChangeText={t => setNewAppointment({ ...newAppointment, date: t })}
            placeholder="Date (YYYY-MM-DD)"
          />
          <TextInput
            style={styles.input}
            value={newAppointment.time}
            onChangeText={t => setNewAppointment({ ...newAppointment, time: t })}
            placeholder="Time (HH:MM)"
          />
          <TextInput
            style={styles.input}
            value={newAppointment.reason}
            onChangeText={t => setNewAppointment({ ...newAppointment, reason: t })}
            placeholder="Reason"
          />
          <TouchableOpacity style={styles.addButton} onPress={handleAddAppointment}>
            <Text style={styles.addButtonText}>Add</Text>
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
  detail: { fontSize: 14, color: '#555' },
  empty: { textAlign: 'center', color: '#aaa', marginTop: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  addBox: { backgroundColor: '#f8f8f8', padding: 16, borderRadius: 10, marginTop: 20 },
  addTitle: { fontWeight: 'bold', marginBottom: 8 },
  input: { backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#ddd', padding: 8, marginBottom: 10 },
  addButton: { backgroundColor: '#3498db', borderRadius: 8, padding: 12, alignItems: 'center' },
  addButtonText: { color: '#fff', fontWeight: 'bold' },
});

export default AppointmentsScreen; 