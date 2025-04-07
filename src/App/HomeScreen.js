import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Alert, ScrollView, Image, TouchableOpacity, SafeAreaView, Platform, StatusBar, ActivityIndicator, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import supabase from '../../supabase';
import Navbar from '../Components/Navbar';
import * as Calendar from 'expo-calendar';
import DataUser from '../../navigation/DataUser';
import { useNavigation } from '@react-navigation/native';

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
  const navigation = useNavigation();
  const hourlyScrollViewRef = useRef(null);
  const hourRowHeight = 70; // Definir altura fixa de cada linha de hora para cálculos precisos

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

  useEffect(() => {
    if (hourlyScrollViewRef.current) {
      setTimeout(() => {
        scrollToCurrentTime();
      }, 300);
    }
  }, [currentHour, isLoading]);

  const scrollToCurrentTime = () => {
    const now = new Date();
    const currentHour = now.getHours();
    
    // Calcula posição exata da hora atual (cada linha tem altura fixa de 70px)
    const position = currentHour * hourRowHeight;
    
    // Ajusta a posição para centralizar a hora na tela
    const scrollViewHeight = 350; // Altura do container do scrollview
    const offsetToCenter = Math.max(0, position - (scrollViewHeight / 2) + (hourRowHeight / 2));
    
    // Scroll para a posição calculada
    if (hourlyScrollViewRef.current) {
      hourlyScrollViewRef.current.scrollTo({ 
        y: offsetToCenter, 
        animated: true 
      });
    }
  };

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

  const getAllHours = () => {
    const hours = [];
    for (let i = 0; i < 24; i++) {
      hours.push(i);
    }
    return hours;
  };

  // Função para calcular e salvar todos os horários de medicação na tabela medication_confirmations
  const calculateAndSaveMedicationSchedule = async (medicationData, userId) => {
    try {
      if (!medicationData.id || !userId) {
        console.error('ID do medicamento ou ID do usuário não fornecido');
        return { error: 'Dados incompletos' };
      }

      console.log(`Calculando horários para medicamento ID: ${medicationData.id}`);
      
      // Array para armazenar todas as datas/horas calculadas
      const scheduledTimes = [];
      
      // Data atual como referência
      const now = new Date();
      let startDate = medicationData.data_inicio ? new Date(medicationData.data_inicio) : now;
      
      // Garantir que a data de início não seja anterior à data atual
      if (startDate < now) {
        startDate = now;
      }
      
      // Data de término (se existir)
      const endDate = medicationData.data_fim ? new Date(medicationData.data_fim) : null;
      
      // Determinar o tipo de frequência e calcular os horários
      if (medicationData.recurrence === 'daily' || !medicationData.recurrence) {
        // Medicamento diário
        const daysToCalculate = endDate ? 
          Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) : 
          30; // Padrão: 30 dias se não houver data final
        
        // Para cada dia no período
        for (let day = 0; day < daysToCalculate; day++) {
          const currentDate = new Date(startDate);
          currentDate.setDate(currentDate.getDate() + day);
          
          // Se houver horários fixos específicos
          if (medicationData.horario_fixo) {
            const hours = medicationData.horario_fixo.split(';');
            for (const hourStr of hours) {
              const [hour, minute] = hourStr.trim().split(':').map(Number);
              const datetime = new Date(currentDate);
              datetime.setHours(hour, minute, 0, 0);
              
              // Só adicionar se a data/hora for no futuro
              if (datetime > now) {
                scheduledTimes.push(datetime.toISOString());
              }
            }
          } 
          // Se for por intervalo de horas
          else if (medicationData.intervalo_horas) {
            const intervalo = parseInt(medicationData.intervalo_horas);
            const startHour = medicationData.hora_inicio || 8; // Padrão: 8h se não especificado
            
            for (let hour = startHour; hour < 24; hour += intervalo) {
              const datetime = new Date(currentDate);
              datetime.setHours(hour, 0, 0, 0);
              
              if (datetime > now) {
                scheduledTimes.push(datetime.toISOString());
              }
            }
          }
          // Caso padrão: uma vez por dia
          else {
            const datetime = new Date(currentDate);
            datetime.setHours(8, 0, 0, 0); // Padrão: 8h da manhã
            
            if (datetime > now) {
              scheduledTimes.push(datetime.toISOString());
            }
          }
        }
      } 
      else if (medicationData.recurrence === 'weekly') {
        // Medicamento semanal
        const weeksToCalculate = endDate ? 
          Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24 * 7)) : 
          4; // Padrão: 4 semanas
        
        // Dias da semana selecionados (0 = Domingo, 6 = Sábado)
        const selectedDays = medicationData.days_of_week || [1, 3, 5]; // Padrão: Segunda, Quarta, Sexta
        
        // Para cada semana no período
        for (let week = 0; week < weeksToCalculate; week++) {
          const weekStart = new Date(startDate);
          weekStart.setDate(weekStart.getDate() + (week * 7));
          
          // Para cada dia da semana selecionado
          for (const dayOfWeek of selectedDays) {
            const currentDate = new Date(weekStart);
            const currentDayOfWeek = currentDate.getDay();
            const daysToAdd = (dayOfWeek - currentDayOfWeek + 7) % 7;
            
            currentDate.setDate(currentDate.getDate() + daysToAdd);
            
            // Aplicar os mesmos cálculos de hora como no caso diário
            if (medicationData.horario_fixo) {
              const hours = medicationData.horario_fixo.split(';');
              for (const hourStr of hours) {
                const [hour, minute] = hourStr.trim().split(':').map(Number);
                const datetime = new Date(currentDate);
                datetime.setHours(hour, minute, 0, 0);
                
                if (datetime > now) {
                  scheduledTimes.push(datetime.toISOString());
                }
              }
            } else {
              const datetime = new Date(currentDate);
              datetime.setHours(8, 0, 0, 0); // Padrão: 8h da manhã
              
              if (datetime > now) {
                scheduledTimes.push(datetime.toISOString());
              }
            }
          }
        }
      }
      else if (medicationData.recurrence === 'once') {
        // Medicamento de dose única
        const datetime = new Date(medicationData.schedule_date || startDate);
        
        // Definir a hora específica se fornecida
        if (medicationData.schedule_time) {
          const [hour, minute] = medicationData.schedule_time.split(':').map(Number);
          datetime.setHours(hour, minute, 0, 0);
        } else {
          datetime.setHours(8, 0, 0, 0); // Padrão: 8h da manhã
        }
        
        if (datetime > now) {
          scheduledTimes.push(datetime.toISOString());
        }
      }
      
      console.log(`Calculados ${scheduledTimes.length} horários para tomar o medicamento`);
      
      // Salvar cada horário calculado na tabela
      const results = [];
      for (const scheduledTime of scheduledTimes) {
        // Verificar se já existe um registro
        const { data: existing, error: checkError } = await supabase
          .from('medication_confirmations')
          .select('id')
          .eq('medication_id', medicationData.id)
          .eq('scheduled_time', scheduledTime)
          .maybeSingle();
        
        if (checkError) {
          console.error('Erro ao verificar registro existente:', checkError);
          continue;
        }
        
        // Se não existir, criar o novo registro
        if (!existing) {
          const confirmationData = {
            medication_id: medicationData.id,
            scheduled_time: scheduledTime,
            user_id: userId,
            taken: null, // Inicialmente null até ser confirmado
            notes: 'Agendado automaticamente',
            created_at: new Date().toISOString()
          };
          
          const { data, error } = await supabase
            .from('medication_confirmations')
            .insert(confirmationData)
            .select('id');
          
          if (error) {
            console.error('Erro ao criar registro de confirmação:', error);
          } else {
            results.push(data[0]);
          }
        } else {
          results.push(existing);
        }
      }
      
      console.log(`Salvos ${results.length} registros na tabela medication_confirmations`);
      return { data: results };
    } catch (error) {
      console.error('Erro ao calcular e salvar horários de medicação:', error);
      return { error };
    }
  };

  const handleSaveMedication = async (medicationData) => {
    try {
      // Salvar o medicamento principal
      const { data, error } = await supabase
        .from('pills_warning')
        .upsert(medicationData)
        .select('id');
      
      if (error) throw error;
      
      // Obter o ID do medicamento salvo
      const medicationId = data[0].id;
      
      // Obter ID do usuário atual
      const userData = DataUser.getUserData();
      const userId = userData.id;
      
      // Calcular e salvar todos os horários
      await calculateAndSaveMedicationSchedule({
        ...medicationData,
        id: medicationId
      }, userId);
      
      Alert.alert('Sucesso', 'Medicamento salvo e todos os horários agendados');
    } catch (error) {
      console.error('Erro ao salvar medicamento:', error);
      Alert.alert('Erro', 'Não foi possível salvar o medicamento');
    }
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
          <TouchableOpacity 
            style={styles.notificationButton}
            onPress={() => navigation.navigate('MedicationTracker')}
          >
            <Ionicons name="notifications-outline" size={24} color="white" />
          </TouchableOpacity>
        </View>

        <ScrollView 
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={true}
          nestedScrollEnabled={true}
        >
          <View style={styles.calendarContainer}>
            <Text style={styles.calendarTitle}>Your Schedule</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.dayScrollView}
              nestedScrollEnabled={true}
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

            <View style={styles.scrollViewContainer}>
              <ScrollView 
                ref={hourlyScrollViewRef}
                style={styles.hourlySchedule}
                showsVerticalScrollIndicator={true}
                contentContainerStyle={styles.hourlyScheduleContent}
                nestedScrollEnabled={true}
              >
                {getAllHours().map((hour) => (
                  <View 
                    key={hour} 
                    style={[
                      styles.hourRow,
                      hour === currentHour && styles.currentHourRow
                    ]}
                  >
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
              <TouchableOpacity 
                style={styles.currentTimeButton}
                onPress={scrollToCurrentTime}
              >
                <Ionicons name="time-outline" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
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
  scrollViewContainer: {
    position: 'relative',
    height: 350,
    borderWidth: 1,
    borderColor: '#F0F0F5',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  hourlySchedule: {
    height: 350,
  },
  hourlyScheduleContent: {
    paddingBottom: 10,
    paddingHorizontal: 5,
  },
  hourRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F5',
    height: 70, // Altura fixa para cálculos precisos de posição
  },
  currentHourRow: {
    backgroundColor: '#F5F7FF',
    borderRadius: 8,
    marginHorizontal: -5,
    paddingHorizontal: 5,
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
  notificationBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#E74C3C',
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fff',
  },
  notificationBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  currentTimeButton: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    backgroundColor: '#6A8DFD',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
});

export default HomeScreen;
