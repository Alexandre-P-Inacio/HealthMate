import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Alert, StyleSheet, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { DoctorAvailabilityService } from '../../services/DoctorAvailabilityService';
import { AppointmentService } from '../../services/AppointmentService'; // Para futuras melhorias (bloquear horários já agendados)
import DataUser from '../../../navigation/DataUser';

// Função para gerar horários baseados na disponibilidade e filtrar horários ocupados
const generateAvailableTimeSlots = async (availabilities, selectedDate, doctorId) => {
  const slots = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const targetDate = new Date(selectedDate);
  targetDate.setHours(0, 0, 0, 0);

  const isToday = targetDate.toDateString() === new Date().toDateString();

  const dayOfWeek = targetDate.getDay(); // 0 = Sunday, 6 = Saturday

  // Buscar consultas já agendadas para o médico na data selecionada
  const bookedAppointmentsResult = await AppointmentService.getDoctorAppointments(doctorId, null, targetDate.toISOString().split('T')[0]);
  const bookedTimes = bookedAppointmentsResult.success ? 
    bookedAppointmentsResult.data.map(app => new Date(app.appointment_datetime).toISOString()) : [];

  // Filtrar por exceções para a data selecionada
  const exceptionForToday = availabilities.find(item => 
    !item.is_recurring && 
    new Date(item.exception_date).toDateString() === targetDate.toDateString()
  );

  let relevantAvailabilities = [];

  if (exceptionForToday) {
    if (exceptionForToday.is_available) {
      relevantAvailabilities.push(exceptionForToday);
    }
    // Se !is_available, não adiciona nenhum horário para esse dia
  } else {
    // Se não há exceção, usar a disponibilidade recorrente
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
      // Não adicionar slots no passado
      if (!isToday || currentSlot > new Date()) {
        const slotId = currentSlot.toISOString();
        // Verificar se o slot já está reservado
        if (!bookedTimes.includes(slotId)) {
          slots.push({
            id: slotId,
            date: new Date(currentSlot),
      });
        }
  }
      currentSlot.setMinutes(currentSlot.getMinutes() + 30); // Slots de 30 em 30 minutos
    }
  }
  return slots;
};

const DoctorSelectTimeScreen = ({ route, navigation }) => {
  const { doctor } = route?.params;
  const [loading, setLoading] = useState(true);
  const [allAvailabilities, setAllAvailabilities] = useState([]);
  const [availableTimes, setAvailableTimes] = useState([]);
  const [selectedTime, setSelectedTime] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const fetchDoctorAvailabilities = useCallback(async () => {
    if (!doctor || !doctor.id) return;
    setLoading(true);
    const result = await DoctorAvailabilityService.getAvailabilityByDoctorId(doctor.id);
    if (result.success) {
      setAllAvailabilities(result.data);
    } else {
      Alert.alert('Erro', result.error);
    }
      setLoading(false);
  }, [doctor]);

  useEffect(() => {
    fetchDoctorAvailabilities();
  }, [fetchDoctorAvailabilities]);

  useEffect(() => {
    // A função generateAvailableTimeSlots agora é assíncrona
    const updateAvailableTimes = async () => {
      if (allAvailabilities.length > 0) {
        const generatedSlots = await generateAvailableTimeSlots(allAvailabilities, selectedDate, doctor.id);
        setAvailableTimes(generatedSlots);
      }
    };
    updateAvailableTimes();
  }, [allAvailabilities, selectedDate, doctor.id]);

  const handleConfirm = () => {
    if (selectedTime) {
      Alert.alert(
        'Confirmar Agendamento',
        `Deseja agendar com Dr. ${doctor.fullname || doctor.name} para ${selectedTime.date.toLocaleString()}?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Agendar',
            onPress: async () => {
              const userData = DataUser.getUserData();
              if (!userData || !userData.id) {
                Alert.alert('Erro', 'Usuário não logado. Por favor, faça login novamente.');
                return;
              }

              const appointmentData = {
                user_id: userData.id,
                doctor_id: doctor.id,
                appointment_datetime: selectedTime.date.toISOString(),
                notes: '', // Opcional: adicionar campo de notas na UI
                status: 'pending', // Ou 'scheduled', dependendo do fluxo
                requested_by: userData.id, // O usuário que solicitou (o próprio paciente)
              };

              const result = await AppointmentService.createAppointment(appointmentData);

              if (result.success) {
                Alert.alert('Sucesso', 'Consulta agendada com sucesso!');
                navigation.goBack(); // Ou navegar para uma tela de confirmação
              } else {
                Alert.alert('Erro', result.errors?.general || result.error || 'Não foi possível agendar a consulta.');
    }
            }
          }
        ]
      );
    }
  };

  const onChangeDate = (event, selectedDate) => {
    const currentDate = selectedDate || new Date();
    setShowDatePicker(Platform.OS === 'ios');
    setSelectedDate(currentDate);
    setSelectedTime(null); // Resetar seleção de horário ao mudar a data
  };

  if (!doctor) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Dados do médico não fornecidos.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Horários Disponíveis para Dr. {doctor.fullname || doctor.name || 'Desconhecido'}</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.datePickerContainer}>
        <Text style={styles.label}>Selecione a Data:</Text>
        <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.datePickerButton}>
          <Ionicons name="calendar-outline" size={20} color="#333" />
          <Text style={styles.datePickerText}>{selectedDate.toLocaleDateString()}</Text>
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display="default"
            onChange={onChangeDate}
            minimumDate={new Date()} // Não permitir selecionar datas passadas
          />
        )}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#3498db" style={{ marginTop: 40 }} />
      ) : (
        availableTimes.length === 0 ? (
          <Text style={styles.emptyText}>Nenhum horário disponível para a data selecionada.</Text>
      ) : (
        <FlatList
          data={availableTimes}
          keyExtractor={item => item.id}
            style={{ marginTop: 20, paddingHorizontal: 20 }}
            numColumns={3} // Mostrar 3 colunas de horários
            columnWrapperStyle={styles.row}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.timeSlot, selectedTime?.id === item.id && styles.selectedTimeSlot]}
              onPress={() => setSelectedTime(item)}
            >
                <Text style={styles.timeText}>{item.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
            </TouchableOpacity>
          )}
        />
        )
      )}
      {selectedTime && !loading && (
        <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
          <Text style={styles.confirmButtonText}>Confirmar Horário</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7fafd',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    textAlign: 'center',
  },
  datePickerContainer: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#555',
    marginBottom: 8,
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#f9f9f9',
  },
  datePickerText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#333',
  },
  timeSlot: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e0e7ef',
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 5, // Espaçamento entre as colunas
  },
  selectedTimeSlot: {
    borderColor: '#3498db',
    backgroundColor: '#eaf3ff',
  },
  timeText: {
    fontSize: 15,
    color: '#333',
    fontWeight: 'bold',
  },
  confirmButton: {
    backgroundColor: '#3498db',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
    marginHorizontal: 20,
    marginBottom: 20, // Espaçamento na parte inferior
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#e74c3c',
    fontSize: 18,
    fontWeight: 'bold',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#555',
  },
  emptyText: {
    textAlign: 'center',
    color: '#888',
    fontSize: 16,
    marginTop: 40,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 10,
  },
});

export default DoctorSelectTimeScreen; 