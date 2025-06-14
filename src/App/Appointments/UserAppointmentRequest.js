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
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import DataUser from '../../../navigation/DataUser';
import { AppointmentService } from '../../services/AppointmentService';
import supabase from '../../../supabase';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const UserAppointmentRequest = () => {
  const navigation = useNavigation();
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [errors, setErrors] = useState({});
  const [specialtyFilter, setSpecialtyFilter] = useState('all');
  const [specialties, setSpecialties] = useState([]);

  const user = DataUser.getUserData();

  useEffect(() => {
    fetchDoctors();
  }, [specialtyFilter]);

  const fetchDoctors = async () => {
    try {
      let query = supabase
        .from('doctors')
        .select('*, appointments(status, appointment_datetime)')
        .order('name');

      if (specialtyFilter !== 'all') {
        query = query.eq('specialization', specialtyFilter);
      }

      const { data, error } = await query;
      
      if (error) throw error;

      // Get unique specialties for filter
      const uniqueSpecialties = [...new Set(data.map(doc => doc.specialization))];
      setSpecialties(uniqueSpecialties);

      // Process doctors' availability
      const processedDoctors = data.map(doctor => ({
        ...doctor,
        activeAppointments: doctor.appointments.filter(
          app => ['pending', 'approved'].includes(app.status)
        ).length
      }));

      setDoctors(processedDoctors);
    } catch (error) {
      console.error('Error fetching doctors:', error);
      Alert.alert('Erro', 'Não foi possível carregar a lista de médicos.');
    } finally {
      setInitialLoading(false);
    }
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (event?.type === 'dismissed') {
      return;
    }
    if (selectedDate) {
      setDate(selectedDate);
      setErrors(prev => ({ ...prev, date: null }));
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setErrors({});
    try {
      if (!selectedDoctor) {
        setErrors({ doctor: 'Selecione um médico' });
        setLoading(false);
        return;
      }
      const result = await AppointmentService.createAppointment({
        userId: user.id,
        doctorId: selectedDoctor.id,
        appointmentDateTime: date.toISOString(),
        location,
        notes,
        status: 'pending',
      });
      if (!result.success) {
        setErrors(result.errors);
        return;
      }
      Alert.alert(
        'Sucesso',
        'Sua solicitação de consulta foi enviada com sucesso! Você receberá uma notificação quando o médico responder.',
        [
          {
            text: 'Ver Minhas Consultas',
            onPress: () => navigation.navigate('MyAppointments')
          },
          {
            text: 'OK',
            onPress: () => {
              setSelectedDoctor(null);
              setDate(new Date());
              setLocation('');
              setNotes('');
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível criar a solicitação de consulta.');
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
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Solicitar Consulta</Text>

      {/* Specialty Filter */}
      <View style={styles.filterSection}>
        <Text style={styles.sectionTitle}>Filtrar por Especialidade</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          <TouchableOpacity
            style={[
              styles.filterChip,
              specialtyFilter === 'all' && styles.activeFilterChip
            ]}
            onPress={() => setSpecialtyFilter('all')}
          >
            <Text style={[
              styles.filterChipText,
              specialtyFilter === 'all' && styles.activeFilterChipText
            ]}>
              Todas
            </Text>
          </TouchableOpacity>
          {specialties.map((specialty) => (
            <TouchableOpacity
              key={specialty}
              style={[
                styles.filterChip,
                specialtyFilter === specialty && styles.activeFilterChip
              ]}
              onPress={() => setSpecialtyFilter(specialty)}
            >
              <Text style={[
                styles.filterChipText,
                specialtyFilter === specialty && styles.activeFilterChipText
              ]}>
                {specialty}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Doctor Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Selecione o Médico</Text>
        {errors.doctor && <Text style={styles.errorText}>{errors.doctor}</Text>}
        <ScrollView style={styles.doctorList}>
          {doctors.map((doctor) => (
            <TouchableOpacity
              key={doctor.id}
              style={[
                styles.doctorCard,
                selectedDoctor?.id === doctor.id && styles.selectedDoctor,
              ]}
              onPress={() => {
                setSelectedDoctor(doctor);
                setErrors(prev => ({ ...prev, doctor: null }));
              }}
            >
              <View style={styles.doctorInfo}>
                {doctor.photo_url ? (
                  <Image
                    source={{ uri: doctor.photo_url }}
                    style={styles.doctorPhoto}
                  />
                ) : (
                  <View style={styles.doctorPhotoPlaceholder}>
                    <Ionicons name="person" size={30} color="#666" />
                  </View>
                )}
                <View style={styles.doctorTextInfo}>
                  <Text style={styles.doctorName}>{doctor.name}</Text>
                  <Text style={styles.doctorSpecialty}>{doctor.specialization}</Text>
                  <Text style={styles.doctorDetails}>
                    CRM: {doctor.crm} • {doctor.years_experience} anos de experiência
                  </Text>
                </View>
              </View>
              <Text style={styles.appointmentCount}>
                {doctor.activeAppointments} consultas ativas
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Date and Time Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data e Hora</Text>
        {errors.date && <Text style={styles.errorText}>{errors.date}</Text>}
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => setShowDatePicker(true)}
        >
          <Ionicons name="calendar" size={24} color="#666" style={styles.inputIcon} />
          <Text style={styles.dateText}>{date.toLocaleString()}</Text>
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="datetime"
            is24Hour={true}
            onChange={handleDateChange}
            minimumDate={new Date()}
          />
        )}
      </View>

      {/* Location */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Local</Text>
        {errors.location && <Text style={styles.errorText}>{errors.location}</Text>}
        <View style={styles.inputContainer}>
          <Ionicons name="location" size={24} color="#666" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            value={location}
            onChangeText={(text) => {
              setLocation(text);
              setErrors(prev => ({ ...prev, location: null }));
            }}
            placeholder="Digite o local da consulta"
          />
        </View>
      </View>

      {/* Notes */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Observações</Text>
        {errors.notes && <Text style={styles.errorText}>{errors.notes}</Text>}
        <View style={styles.inputContainer}>
          <Ionicons name="create" size={24} color="#666" style={styles.inputIcon} />
          <TextInput
            style={[styles.input, styles.textArea]}
            value={notes}
            onChangeText={(text) => {
              setNotes(text);
              setErrors(prev => ({ ...prev, notes: null }));
            }}
            placeholder="Digite alguma observação (opcional)"
            multiline
            numberOfLines={4}
          />
        </View>
      </View>

      {/* Submit Button */}
      <TouchableOpacity
        style={[styles.submitButton, loading && styles.disabledButton]}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Ionicons name="checkmark-circle" size={24} color="#fff" style={styles.submitIcon} />
            <Text style={styles.submitButtonText}>Solicitar Consulta</Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
    color: '#444',
  },
  filterSection: {
    marginBottom: 20,
  },
  filterScroll: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  filterChip: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    marginRight: 10,
    elevation: 2,
  },
  activeFilterChip: {
    backgroundColor: '#2196f3',
  },
  filterChipText: {
    color: '#666',
  },
  activeFilterChipText: {
    color: '#fff',
  },
  doctorList: {
    maxHeight: 300,
  },
  doctorCard: {
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 10,
    elevation: 2,
  },
  selectedDoctor: {
    backgroundColor: '#e3f2fd',
    borderColor: '#2196f3',
    borderWidth: 1,
  },
  doctorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  doctorPhoto: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 15,
  },
  doctorPhotoPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#eee',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  doctorTextInfo: {
    flex: 1,
  },
  doctorName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  doctorSpecialty: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  doctorDetails: {
    fontSize: 12,
    color: '#888',
  },
  appointmentCount: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    textAlign: 'right',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    elevation: 2,
  },
  inputIcon: {
    padding: 15,
  },
  input: {
    flex: 1,
    padding: 15,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    elevation: 2,
  },
  dateText: {
    marginLeft: 10,
  },
  errorText: {
    color: '#f44336',
    fontSize: 12,
    marginBottom: 5,
  },
  submitButton: {
    backgroundColor: '#2196f3',
    padding: 15,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  submitIcon: {
    marginRight: 10,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default UserAppointmentRequest; 