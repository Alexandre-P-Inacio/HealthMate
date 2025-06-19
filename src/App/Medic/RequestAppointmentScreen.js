import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  FlatList,
  ScrollView,
  Image,
  Modal,
  Button
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppointmentService } from '../../services/AppointmentService';
import { DoctorAvailabilityService } from '../../services/DoctorAvailabilityService';
import DoctorService from '../../services/DoctorService';
import { validateAppointmentRequest } from '../../utils/validation';
import DataUser from '../../../navigation/DataUser';
import DateTimePicker from '@react-native-community/datetimepicker';

const RequestAppointmentScreen = ({ route, navigation }) => {
  const { doctor: initialDoctor } = route.params || {};

  const [loading, setLoading] = useState(false);
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [availableTimeSlots, setAvailableTimeSlots] = useState([]);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(null);
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    console.log('useEffect: DataUser.getUserData chamado');
    const currentUser = DataUser.getUserData();
    if (currentUser && currentUser.id) {
      setUserId(currentUser.id);
      console.log('UserId setado:', currentUser.id);
    } else {
      console.log('Usuário não logado, voltando.');
      Alert.alert('Erro', 'Usuário não logado. Por favor, faça login novamente.');
      navigation.goBack();
    }
  }, []);

  // Fetch doctors (no need to fetch user details separately now)
  useEffect(() => {
    const fetchDoctors = async () => {
      console.log('fetchDoctors chamado');
      setLoading(true);
      if (initialDoctor) {
        setSelectedDoctor(initialDoctor);
        setDoctors([initialDoctor]); // Definir o médico inicial na lista de médicos
        console.log('Médico inicial definido:', initialDoctor);
      } else {
        const result = await DoctorService.getAllDoctors();
        console.log('Resultado getAllDoctors:', result);
        if (result.success) {
          setDoctors(result.data);
        } else {
          Alert.alert('Erro', result.error || 'Não foi possível carregar a lista de médicos.');
        }
      }
      setLoading(false);
      console.log('fetchDoctors terminou, loading:', false);
    };
    fetchDoctors();
  }, [initialDoctor]);

  // Fetch doctor availabilities and generate time slots
  useEffect(() => {
    const fetchAvailabilityAndGenerateSlots = async () => {
      console.log('fetchAvailabilityAndGenerateSlots chamado', { selectedDoctor, userId, selectedDate });
      if (selectedDoctor && selectedDoctor.id && userId) {
        setLoading(true);
        const availabilitiesResult = await DoctorAvailabilityService.getAvailabilityByDoctorId(selectedDoctor.id);
        console.log('availabilitiesResult:', availabilitiesResult);
        if (availabilitiesResult.success) {
          // Reutiliza a lógica de geração de slots da DoctorSelectTimeScreen
          const generatedSlots = await generateAvailableTimeSlots(
            availabilitiesResult.data,
            selectedDate,
            selectedDoctor.id
          );
          setAvailableTimeSlots(generatedSlots);
          console.log('generatedSlots:', generatedSlots);
        } else {
          Alert.alert('Erro', availabilitiesResult.error || 'Não foi possível carregar a disponibilidade do médico.');
        }
        setLoading(false);
        console.log('fetchAvailabilityAndGenerateSlots terminou, loading:', false);
      } else {
        setAvailableTimeSlots([]); // Limpar slots se nenhum médico selecionado
        console.log('Nenhum médico selecionado ou userId ausente.');
      }
    };
    fetchAvailabilityAndGenerateSlots();
  }, [selectedDoctor, selectedDate, userId]);

  // Reutilizando a função de DoctorSelectTimeScreen (precisa ser definida aqui ou importada)
  const generateAvailableTimeSlots = async (availabilities, date, doctorId) => {
    console.log('generateAvailableTimeSlots chamado', { availabilities, date, doctorId });
    const slots = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    const isToday = targetDate.toDateString() === new Date().toDateString();
    const dayOfWeek = targetDate.getDay();

    const bookedAppointmentsResult = await AppointmentService.getDoctorAppointments(doctorId, null, targetDate.toISOString().split('T')[0]);
    const bookedTimes = bookedAppointmentsResult.success ?
      bookedAppointmentsResult.data.map(app => new Date(app.appointment_datetime).toISOString()) : [];

    const exceptionForToday = availabilities.find(item =>
      !item.is_recurring && new Date(item.exception_date).toDateString() === targetDate.toDateString()
    );

    let relevantAvailabilities = [];
    if (exceptionForToday) {
      if (exceptionForToday.is_available) {
        relevantAvailabilities.push(exceptionForToday);
      }
    } else {
      relevantAvailabilities = availabilities.filter(item =>
        item.is_recurring && item.day_of_week === dayOfWeek
      );
    }

    for (const availability of relevantAvailabilities) {
      let startHour = parseInt(availability.start_time.substring(0, 2));
      let startMinute = parseInt(availability.start_time.substring(3, 5));
      let endHour = parseInt(availability.end_time.substring(0, 2));
      let endMinute = parseInt(availability.end_time.substring(3, 5));

      let currentSlot = new Date(targetDate);
      currentSlot.setHours(startHour, startMinute, 0, 0);

      const endOfAvailability = new Date(targetDate);
      endOfAvailability.setHours(endHour, endMinute, 0, 0);

      while (currentSlot < endOfAvailability) {
        // Adiciona 24 horas de antecedência à validação aqui também
        if (currentSlot.getTime() > (new Date().getTime() + 24 * 60 * 60 * 1000)) {
          const slotId = currentSlot.toISOString();
          if (!bookedTimes.includes(slotId)) {
            slots.push({
              id: slotId,
              date: new Date(currentSlot),
            });
          }
        }
        currentSlot.setMinutes(currentSlot.getMinutes() + 60);
      }
    }
    return slots;
  };

  const onChangeDate = (event, selected) => {
    const currentDate = selected || selectedDate;
    setShowDatePicker(Platform.OS === 'ios');
    setSelectedDate(currentDate);
    setSelectedTimeSlot(null);
  };

  const onChangeTime = (event, selected) => {
    const currentTime = selected || selectedDate;
    setShowTimePicker(Platform.OS === 'ios');
    setSelectedDate(prev => {
      const newDate = new Date(prev);
      newDate.setHours(currentTime.getHours());
      newDate.setMinutes(currentTime.getMinutes());
      return newDate;
    });
    setSelectedTimeSlot(null);
  };

  const handleSubmit = async () => {
    console.log('handleSubmit chamado');
    if (!selectedDoctor || !selectedTimeSlot || !userId) {
      Alert.alert('Erro', 'Por favor, preencha todos os campos necessários.');
      return;
    }

    const appointmentData = {
      user_id: userId,
      doctor_id: selectedDoctor.id,
      appointment_datetime: selectedTimeSlot.date.toISOString(),
      location: location.trim() === '' ? 'Clínica Padrão' : location,
      notes: notes,
      status: 'pending',
      requested_by: userId,
    };

    const validation = validateAppointmentRequest(appointmentData);
    if (!validation.isValid) {
      const errorMessages = Object.values(validation.errors).join('\n');
      Alert.alert('Erro de Validação', errorMessages);
      return;
    }

    setLoading(true);
    const result = await AppointmentService.createAppointment(appointmentData);
    setLoading(false);
    console.log('Resultado createAppointment:', result);

    if (result.success) {
      Alert.alert('Sucesso', 'Sua solicitação de consulta foi enviada!');
      navigation.goBack();
    } else {
      Alert.alert('Erro', result.errors?.general || result.error || 'Não foi possível enviar a solicitação.');
    }
  };

  const renderDoctorItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.doctorCard, selectedDoctor?.id === item.id && styles.selectedDoctorCard]}
      onPress={() => setSelectedDoctor(item)}
      disabled={!!initialDoctor} // Desabilita seleção se já houver um médico inicial
    >
      <Image
        source={item.user?.pfpimg ? { uri: `data:image/png;base64,${item.user.pfpimg}` } : { uri: 'https://img.icons8.com/ios-filled/100/3498db/doctor-male.png' }}
        style={styles.doctorImage}
      />
      <View style={styles.doctorInfo}>
        <Text style={styles.doctorName}>{item.user?.fullname}</Text>
        <Text style={styles.doctorSpecialization}>Especialidade: {item.specialization || 'Não informado'}</Text>
        <Text style={styles.doctorDetails}>Experiência: {item.years_experience || 'Não informado'} anos</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196f3" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#3498db' }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 16 }}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={{ color: '#fff', fontSize: 20, fontWeight: 'bold' }}>Agendar Consulta</Text>
      </View>

      {/* Nunca mostrar a lista de médicos se initialDoctor estiver presente */}
      {(!initialDoctor && doctors.length > 0) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Selecione o Médico</Text>
          <FlatList
            data={doctors}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderDoctorItem}
            horizontal={true}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.doctorListContainer}
          />
        </View>
      )}

      {/* Sempre mostrar o médico selecionado se houver initialDoctor */}
      {(selectedDoctor && initialDoctor) && (
        <View style={styles.selectedDoctorSection}>
          <Text style={styles.sectionTitle}>Médico Selecionado</Text>
          <View style={styles.selectedDoctorCardDisplay}>
            <Image
              source={selectedDoctor.user?.pfpimg ? { uri: `data:image/png;base64,${selectedDoctor.user.pfpimg}` } : { uri: 'https://img.icons8.com/ios-filled/100/3498db/doctor-male.png' }}
              style={styles.selectedDoctorImage}
            />
            <View style={styles.selectedDoctorInfo}>
              <Text style={styles.selectedDoctorName}>{selectedDoctor.user?.fullname}</Text>
              <Text style={styles.selectedDoctorSpecialization}>{selectedDoctor.specialization || 'Especialidade não informada'}</Text>
            </View>
          </View>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data e Hora</Text>
        <View style={styles.dateTimeContainer}>
          <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.datePickerButton}>
            <Ionicons name="calendar-outline" size={20} color="#fff" />
            <Text style={styles.datePickerButtonText}>{selectedDate.toLocaleDateString()}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {selectedDoctor && availableTimeSlots.length > 0 ? (
        <View>
          <Text style={styles.sectionSubtitle}>Horários Disponíveis ({selectedDate.toLocaleDateString()})</Text>
          <FlatList
            data={availableTimeSlots}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.timeSlotButton,
                  selectedTimeSlot?.id === item.id && styles.selectedTimeSlotButton,
                ]}
                onPress={() => setSelectedTimeSlot(item)}
              >
                <Text style={[
                  styles.timeSlotText,
                  selectedTimeSlot?.id === item.id && styles.selectedTimeSlotTextSelected,
                ]}>
                  {item.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </TouchableOpacity>
            )}
            numColumns={3}
            columnWrapperStyle={styles.timeSlotRow}
          />
        </View>
      ) : (
        selectedDoctor && <Text style={styles.noAvailabilityText}>Nenhum horário disponível para a data selecionada.</Text>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Detalhes da Consulta</Text>
        <TextInput
          style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
          placeholder="Notas ou observações (opcional)"
          value={notes}
          onChangeText={setNotes}
          multiline
        />
      </View>

      <TouchableOpacity
        style={[styles.submitButton, !selectedTimeSlot && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={!selectedTimeSlot}
      >
        <Text style={styles.submitButtonText}>Confirmar Agendamento</Text>
      </TouchableOpacity>

    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F6FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F6FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#3498db',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 16,
  },
  section: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 16,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  sectionSubtitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 10,
    color: '#555',
  },
  doctorListContainer: {
    paddingRight: 10,
  },
  doctorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0E8F9',
    borderRadius: 10,
    padding: 15,
    marginRight: 10,
    marginBottom: 5,
    width: 250, // Fixed width for horizontal scroll
  },
  selectedDoctorCard: {
    borderWidth: 2,
    borderColor: '#6A8DFD',
  },
  doctorImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 15,
    borderWidth: 2,
    borderColor: '#6A8DFD',
  },
  doctorInfo: {
    flex: 1,
  },
  doctorName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  doctorSpecialization: {
    fontSize: 14,
    color: '#666',
  },
  doctorDetails: {
    fontSize: 12,
    color: '#888',
  },
  dateTimeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  datePickerButton: {
    flex: 1,
    backgroundColor: '#6A8DFD',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 5,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  datePickerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  timeSlotButton: {
    backgroundColor: '#E8ECF4',
    padding: 10,
    borderRadius: 5,
    margin: 5,
    flex: 1,
    alignItems: 'center',
    minWidth: 80,
  },
  selectedTimeSlotButton: {
    backgroundColor: '#6A8DFD',
  },
  timeSlotText: {
    color: '#333',
    fontWeight: 'bold',
  },
  timeSlotTextSelected: {
    color: '#fff',
  },
  timeSlotRow: {
    justifyContent: 'flex-start',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    fontSize: 16,
  },
  submitButton: {
    backgroundColor: '#6A8DFD',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    margin: 16,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  submitButtonDisabled: {
    backgroundColor: '#b0b7c3',
  },
  noAvailabilityText: {
    textAlign: 'center',
    marginTop: 20,
    color: '#888',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  iosPickerContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  selectedDoctorSection: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 16,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedDoctorCardDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0E8F9',
    borderRadius: 10,
    padding: 15,
  },
  selectedDoctorImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginRight: 15,
    borderWidth: 2,
    borderColor: '#6A8DFD',
  },
  selectedDoctorInfo: {
    flex: 1,
  },
  selectedDoctorName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  selectedDoctorSpecialization: {
    fontSize: 15,
    color: '#666',
  },
});

export default RequestAppointmentScreen; 