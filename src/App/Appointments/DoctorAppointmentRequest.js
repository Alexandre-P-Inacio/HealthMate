import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
  Modal,
} from 'react-native';
import CalendarPicker from 'react-native-calendar-picker';
import supabase from '../../../supabase';
import { Ionicons } from '@expo/vector-icons';
import DataUser from '../../../navigation/DataUser';

const DoctorAppointmentRequest = ({ navigation }) => {
  const doctor = DataUser.getUserData();
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [date, setDate] = useState(new Date());
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [errors, setErrors] = useState({});
  const [reason, setReason] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [observations, setObservations] = useState('');
  const [showCalendar, setShowCalendar] = useState(false);
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [tempDate, setTempDate] = useState(new Date());
  const [tempHour, setTempHour] = useState(date.getHours());
  const [tempMinute, setTempMinute] = useState(date.getMinutes());

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, fullname, email, phone, pfpimg, role')
        .eq('role', 'user');
      if (error) throw error;
      setPatients(data);
    } catch (error) {
      console.error('Error fetching patients:', error);
      Alert.alert('Erro', 'Não foi possível carregar a lista de pacientes.');
    } finally {
      setInitialLoading(false);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setErrors({});
    try {
      if (!selectedPatient) {
        setErrors({ patient: 'Selecione um paciente' });
        setLoading(false);
        return;
      }
      const formattedNotes =
        `Motivo: ${reason}\n` +
        `Sintomas: ${symptoms}\n` +
        `Observações: ${observations}\n` +
        `Notas adicionais: ${notes}`;
      const { data, error } = await supabase
        .from('appointments')
        .insert([
          {
            user_id: selectedPatient.id,
            doctor_id: doctor.id,
            appointment_datetime: date.toISOString(),
            location,
            notes: formattedNotes,
            status: 'scheduled',
          },
        ]);
      if (error) throw error;
      Alert.alert(
        'Sucesso',
        'Consulta agendada com sucesso!',
        [
          {
            text: 'Ver Consultas',
            onPress: () => navigation.goBack(),
          },
          {
            text: 'OK',
            onPress: () => {
              setSelectedPatient(null);
              setDate(new Date());
              setLocation('');
              setNotes('');
              setReason('');
              setSymptoms('');
              setObservations('');
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível agendar a consulta.');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196f3" />
      </View>
    );
  }

  return (
    <View style={{flex: 1, backgroundColor: '#f5f5f5'}}>
      <View style={{flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#3498db'}}>
        <TouchableOpacity onPress={() => navigation.navigate('AccountScreen')} style={{marginRight: 16}}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={{color: '#fff', fontSize: 20, fontWeight: 'bold'}}>Agendar Consulta para Paciente</Text>
      </View>
      <ScrollView style={styles.container}>
        <Text style={styles.title}>Agendar Consulta para Paciente</Text>
        {/* Patient Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Selecione o Paciente</Text>
          {errors.patient && <Text style={styles.errorText}>{errors.patient}</Text>}
          <ScrollView style={styles.patientList}>
            {patients.map((patient) => (
              <TouchableOpacity
                key={patient.id}
                style={[
                  styles.patientCard,
                  selectedPatient?.id === patient.id && styles.selectedPatient,
                ]}
                onPress={() => {
                  setSelectedPatient(patient);
                  setErrors(prev => ({ ...prev, patient: null }));
                }}
              >
                <View style={styles.patientInfo}>
                  {patient.pfpimg ? (
                    <Image
                      source={{ uri: `data:image/png;base64,${patient.pfpimg}` }}
                      style={styles.patientPhoto}
                    />
                  ) : (
                    <View style={styles.patientPhotoPlaceholder}>
                      <Ionicons name="person" size={32} color="#ccc" />
                    </View>
                  )}
                  <View>
                    <Text style={styles.patientName}>{patient.fullname}</Text>
                    <Text style={styles.patientEmail}>{patient.email}</Text>
                    <Text style={styles.patientPhone}>{patient.phone}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
        {/* Date Picker */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data e Hora</Text>
          <TouchableOpacity
            style={styles.datePickerButton}
            onPress={() => setShowCalendar(true)}
          >
            <Ionicons name="calendar" size={20} color="#3498db" />
            <Text style={styles.datePickerText}>{date.toLocaleString()}</Text>
          </TouchableOpacity>
        </View>
        {/* Calendar Modal */}
        <Modal visible={showCalendar} transparent animationType="slide">
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0008' }}>
            <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 20 }}>
              <CalendarPicker
                onDateChange={d => {
                  setTempDate(new Date(d));
                  setShowCalendar(false);
                  setShowTimeModal(true);
                }}
                selectedStartDate={tempDate}
              />
              <TouchableOpacity onPress={() => setShowCalendar(false)} style={{ marginTop: 10 }}>
                <Text style={{ color: '#e74c3c', fontWeight: 'bold', textAlign: 'center' }}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
        {/* Time Picker Modal */}
        <Modal visible={showTimeModal} transparent animationType="slide">
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0008' }}>
            <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 20, alignItems: 'center' }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>Selecione o Horário</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                <Text style={{ fontSize: 20 }}>Hora: </Text>
                <TouchableOpacity onPress={() => setTempHour((tempHour + 23) % 24)}><Text style={{ fontSize: 24, marginHorizontal: 8 }}>-</Text></TouchableOpacity>
                <Text style={{ fontSize: 24, minWidth: 30, textAlign: 'center' }}>{tempHour.toString().padStart(2, '0')}</Text>
                <TouchableOpacity onPress={() => setTempHour((tempHour + 1) % 24)}><Text style={{ fontSize: 24, marginHorizontal: 8 }}>+</Text></TouchableOpacity>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                <Text style={{ fontSize: 20 }}>Minuto: </Text>
                <TouchableOpacity onPress={() => setTempMinute((tempMinute + 59) % 60)}><Text style={{ fontSize: 24, marginHorizontal: 8 }}>-</Text></TouchableOpacity>
                <Text style={{ fontSize: 24, minWidth: 30, textAlign: 'center' }}>{tempMinute.toString().padStart(2, '0')}</Text>
                <TouchableOpacity onPress={() => setTempMinute((tempMinute + 1) % 60)}><Text style={{ fontSize: 24, marginHorizontal: 8 }}>+</Text></TouchableOpacity>
              </View>
              <TouchableOpacity onPress={() => {
                const newDate = new Date(tempDate);
                newDate.setHours(tempHour, tempMinute, 0, 0);
                setDate(newDate);
                setShowTimeModal(false);
              }} style={{ backgroundColor: '#3498db', padding: 10, borderRadius: 8, marginBottom: 10 }}>
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Confirmar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowTimeModal(false)}>
                <Text style={{ color: '#e74c3c', fontWeight: 'bold' }}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
        {/* Location */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Local</Text>
          <TextInput
            style={styles.input}
            value={location}
            onChangeText={setLocation}
            placeholder="Digite o local da consulta"
          />
        </View>
        {/* More fields for appointment info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Motivo</Text>
          <TextInput
            style={styles.input}
            value={reason}
            onChangeText={setReason}
            placeholder="Motivo da consulta"
          />
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sintomas</Text>
          <TextInput
            style={styles.input}
            value={symptoms}
            onChangeText={setSymptoms}
            placeholder="Sintomas do paciente"
          />
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Observações</Text>
          <TextInput
            style={styles.input}
            value={observations}
            onChangeText={setObservations}
            placeholder="Observações gerais"
          />
        </View>
        {/* Submit */}
        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.submitButtonText}>{loading ? 'Salvando...' : 'Agendar Consulta'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#3498db',
    marginBottom: 20,
    textAlign: 'center',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  patientList: {
    maxHeight: 200,
  },
  patientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  selectedPatient: {
    borderColor: '#3498db',
    borderWidth: 2,
  },
  patientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  patientPhoto: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  patientPhotoPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#eee',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  patientName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  patientEmail: {
    fontSize: 14,
    color: '#888',
  },
  patientPhone: {
    fontSize: 14,
    color: '#888',
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  datePickerText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#3498db',
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#eee',
    fontSize: 16,
  },
  submitButton: {
    backgroundColor: '#3498db',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorText: {
    color: '#e74c3c',
    marginBottom: 8,
  },
});

export default DoctorAppointmentRequest; 