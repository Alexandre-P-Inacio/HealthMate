import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Alert, SafeAreaView, Platform, StatusBar, TouchableOpacity, RefreshControl, Modal, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DoctorAppointmentService from '../../services/DoctorAppointmentService';
import { AppointmentService } from '../../services/AppointmentService';
import DataUser from '../../../navigation/DataUser';
import Navbar from '../../Components/Navbar';
import supabase from '../../../supabase';
import DateTimePicker from '@react-native-community/datetimepicker';
import { DoctorAvailabilityService } from '../../services/DoctorAvailabilityService';

const FILTERS = [
  { label: 'All', value: 'all' },
  { label: 'Upcoming', value: 'upcoming' },
  { label: 'Past', value: 'past' },
  { label: 'Cancelled', value: 'cancelled' },
];

const AppointmentsScreen = ({ navigation }) => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState(null);
  const [isMedic, setIsMedic] = useState(false);
  const [filter, setFilter] = useState('all');
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [reportText, setReportText] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestDate, setRequestDate] = useState(new Date());
  const [requestLocation, setRequestLocation] = useState('');
  const [requestNotes, setRequestNotes] = useState('');
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [reportType, setReportType] = useState('normal');
  const [chargedValue, setChargedValue] = useState('');

  // Novos estados para o modal de cancelamento
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [isReportEditable, setIsReportEditable] = useState(false);

  const [userDoctorData, setUserDoctorData] = useState(null); // Estado para dados do médico

  // Add state for rating modal
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [rating, setRating] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [ratedAppointmentId, setRatedAppointmentId] = useState(null);

  // Add state for ratings per appointment
  const [doctorRatingsForUser, setDoctorRatingsForUser] = useState({});

  // Add state for anonymity
  const [isAnonymous, setIsAnonymous] = useState(false);

  // Adicionar estados para slots disponíveis e slot selecionado
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);

  useEffect(() => {
    const currentUser = DataUser.getUserData();
    if (currentUser && currentUser.id) {
      const id = parseInt(currentUser.id);
      setUserId(isNaN(id) ? null : id);
      setIsMedic(currentUser.role === 'doctor' || currentUser.role === 'medic');
    } else {
      Alert.alert('Error', 'User not logged in.');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const checkUserRoleAndFetchDoctorData = async () => {
      const userData = DataUser.getUserData();
      if (userData && (userData.role === 'doctor' || userData.role === 'medic')) {
        setIsMedic(true);
        // Buscar dados completos do médico logado
        const { data: doctorData, error: doctorError } = await supabase
          .from('doctors')
          .select('*')
          .eq('user_id', userData.id)
          .single();

        if (doctorError) {
          console.error('Error fetching doctor data:', doctorError.message);
        } else {
          setUserDoctorData(doctorData); // Guardar os dados completos do médico
        }
      } else {
        setIsMedic(false);
      }
      // Ensure userId is valid before fetching appointments
      if (userId) {
        fetchAppointments(filter);
      }
    };
    checkUserRoleAndFetchDoctorData();
  }, [filter, userId]);

  useEffect(() => {
    if (userId) {
      fetchAppointments();
    }
    // eslint-disable-next-line
  }, [userId, filter]);

  useEffect(() => {
    const now = new Date();
    // Only run if appointments are loaded
    if (appointments && appointments.length > 0) {
      appointments.forEach(async (appointment) => {
        const appointmentDate = new Date(appointment.appointment_datetime);
        const fiveHoursAfter = new Date(appointmentDate.getTime() + 5 * 60 * 60 * 1000);
        if (
          fiveHoursAfter < now &&
          appointment.status === 'confirmed' &&
          (!appointment.notes || appointment.notes.trim() === '')
        ) {
          // Update status to 'no-show'
          await supabase
            .from('appointments')
            .update({ status: 'no-show' })
            .eq('id', appointment.id);
          // Optionally, you can refetch appointments here if needed
          fetchAppointments && fetchAppointments();
        }
      });
    }
    // eslint-disable-next-line
  }, [appointments]);

  useEffect(() => {
    // Fetch ratings for this user
    const fetchUserRatings = async () => {
      const { data, error } = await supabase.from('doctor_ratings').select('appointment_id').eq('user_id', userId);
      if (!error && data) {
        const map = {};
        data.forEach(r => { map[r.appointment_id] = true; });
        setDoctorRatingsForUser(map);
      }
    };
    if (userId) fetchUserRatings();
  }, [userId, appointments]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      if (!userId) {
        console.warn('Cannot fetch appointments: userId is null or undefined.');
        setLoading(false);
        return;
      }
      
      console.log(`🔍 [AppointmentsScreen] Fetching appointments for userId: ${userId}, isMedic: ${isMedic}`);
      let data = [];
      if (isMedic) {
        const res = await AppointmentService.getDoctorAppointments(userId);
        if (res.success) {
          data = res.data;
          console.log(`✅ [AppointmentsScreen] Doctor appointments fetched: ${data.length} appointments`);
        } else {
          console.error(`❌ [AppointmentsScreen] Failed to fetch doctor appointments:`, res.error);
        }
        // Fallback: fetch user data if missing
        for (let apt of data) {
          if (!apt.users || (!apt.users.fullname && !apt.users.name)) {
            console.log(`🔍 Fetching missing user data for user_id: ${apt.user_id}`);
            const { data: userData, error: userError } = await supabase
              .from('users')
              .select('fullname, email')
              .eq('id', apt.user_id)
              .single();
            
            if (!userError && userData) {
              apt.users = { 
                fullname: userData.fullname || userData.email?.split('@')[0] || 'Patient',
                email: userData.email
              };
              console.log(`✅ Found user data: ${apt.users.fullname}`);
            } else {
              console.log(`❌ No user data found for user_id: ${apt.user_id}`);
              apt.users = { fullname: 'Patient' };
            }
          }
        }
      } else {
        const res = await AppointmentService.getUserAppointments(userId);
        if (res.success) {
          data = res.data;
          console.log(`✅ [AppointmentsScreen] User appointments fetched: ${data.length} appointments`);
        } else {
          console.error(`❌ [AppointmentsScreen] Failed to fetch user appointments:`, res.error);
        }
        // Fallback: fetch doctor data if missing
        for (let apt of data) {
          if (!apt.doctors || (!apt.doctors.fullname && !apt.doctors.name)) {
            if (apt.doctor_id) {
              console.log(`🔍 Fetching missing doctor data for doctor_id: ${apt.doctor_id}`);
              // Fetch doctor from doctors table
              const { data: doctorData, error: doctorError } = await supabase
                .from('doctors')
                .select('id, name, user_id')
                .eq('id', apt.doctor_id)
                .single();
              
              if (!doctorError && doctorData) {
                // Fetch user fullname from users table
                const { data: userData, error: userError } = await supabase
                  .from('users')
                  .select('fullname, email')
                  .eq('id', doctorData.user_id)
                  .single();
                
                if (!userError && userData) {
                  apt.doctors = { 
                    fullname: userData.fullname || userData.email?.split('@')[0] || doctorData.name || 'Doctor', 
                    name: doctorData.name,
                    user_id: doctorData.user_id
                  };
                  console.log(`✅ Found doctor data: ${apt.doctors.fullname}`);
                } else if (doctorData.name) {
                  apt.doctors = { name: doctorData.name, fullname: doctorData.name };
                  console.log(`✅ Using doctor name: ${doctorData.name}`);
                } else {
                  apt.doctors = { fullname: 'Doctor' };
                  console.log(`❌ No doctor data found for doctor_id: ${apt.doctor_id}`);
                }
              } else {
                console.log(`❌ No doctor found for doctor_id: ${apt.doctor_id}`);
                apt.doctors = { fullname: 'Doctor' };
              }
            }
          }
        }
      }
      const filteredData = applyFilter(data, filter);
      console.log(`📊 [AppointmentsScreen] Final appointments after filter '${filter}':`, filteredData.length);
      
      // Debug: log first appointment's data structure
      if (filteredData.length > 0) {
        console.log(`🔍 [AppointmentsScreen] First appointment data:`, {
          id: filteredData[0].id,
          user_id: filteredData[0].user_id,
          doctor_id: filteredData[0].doctor_id,
          users: filteredData[0].users,
          doctors: filteredData[0].doctors
        });
      }
      
      setAppointments(filteredData);
    } catch (error) {
      Alert.alert('Error', 'Failed to load appointments.');
      console.error('Error fetching appointments:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const applyFilter = (data, filter) => {
    const now = new Date();
    switch (filter) {
      case 'upcoming':
        return data.filter(a => {
          const appointmentDate = new Date(a.appointment_datetime);
          const oneHourAfter = new Date(appointmentDate.getTime() + 60 * 60 * 1000);
          // Mostrar 'pending' e 'confirmed' futuros
          return (a.status === 'pending' || a.status === 'confirmed') && oneHourAfter > now;
        });
      case 'past':
        return data.filter(a => {
          const appointmentDate = new Date(a.appointment_datetime);
          const oneHourAfter = new Date(appointmentDate.getTime() + 60 * 60 * 1000);
          // Mostrar qualquer consulta cujo horário já passou (exceto canceladas)
          return oneHourAfter <= now && a.status !== 'cancelled';
        });
      case 'cancelled':
        return data.filter(a => a.status === 'cancelled');
      default:
        return data;
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchAppointments();
  };

  const handleStatusChange = async (appointmentId, newStatus) => {
    try {
      setLoading(true);
      const res = await AppointmentService.updateAppointmentStatus(appointmentId, newStatus, userId);
      if (res.success) {
        fetchAppointments();
        Alert.alert('Success', `Appointment ${newStatus}`);
      } else {
        Alert.alert('Error', res.error || 'Failed to update appointment.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update appointment.');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestNewDate = async (appointmentId, doctorId, newSlot) => {
    try {
      const result = await AppointmentService.requestDateChange(
        appointmentId,
        newSlot,
        isMedic ? doctorId : userId
      );
      if (result.success) {
        setShowRequestModal(false);
        setRequestDate(new Date());
        setAvailableSlots([]);
        setSelectedSlot(null);
        fetchAppointments();
      }
    } catch (error) {
      console.error('Error requesting new date:', error);
    }
  };

  const handleCancelConfirmation = async () => {
    if (!cancelReason.trim()) {
      Alert.alert('Erro', 'Por favor, forneça um motivo para o cancelamento.');
      return;
    }
    if (!selectedAppointment || !userId) {
      Alert.alert('Erro', 'Dados da consulta ou usuário não disponíveis.');
      return;
    }

    try {
      setLoading(true);
      const result = await AppointmentService.cancelAppointment(
        selectedAppointment.id,
        userId,
        cancelReason
      );

      if (result.success) {
        setShowCancelModal(false);
        setCancelReason('');
        setSelectedAppointment(null);
        fetchAppointments();
        Alert.alert('Sucesso', 'Consulta cancelada com sucesso!');
      } else {
        Alert.alert('Erro', result.error || 'Não foi possível cancelar a consulta.');
      }
    } catch (error) {
      console.error('Error canceling appointment:', error);
      Alert.alert('Erro', 'Ocorreu um erro ao cancelar a consulta.');
    } finally {
      setLoading(false);
    }
  };

  // Função para buscar horários disponíveis do médico para o dia selecionado
  const fetchAvailableSlots = async (doctorId, date) => {
    setAvailableSlots([]);
    setSelectedSlot(null);
    const result = await DoctorAvailabilityService.getAvailabilityByDoctorId(doctorId);
    if (!result.success) return;
    const availabilities = result.data;
    const dayOfWeek = date.getDay();
    const slots = [];
    availabilities.filter(a => a.is_recurring && a.day_of_week === dayOfWeek).forEach(a => {
      let start = a.start_time.split(':');
      let end = a.end_time.split(':');
      let startHour = parseInt(start[0]);
      let startMinute = parseInt(start[1]);
      let endHour = parseInt(end[0]);
      let endMinute = parseInt(end[1]);
      let current = new Date(date);
      current.setHours(startHour, startMinute, 0, 0);
      const endTime = new Date(date);
      endTime.setHours(endHour, endMinute, 0, 0);
      while (current < endTime) {
        slots.push(new Date(current));
        current = new Date(current.getTime() + 60 * 60 * 1000); // 1h slots
      }
    });
    setAvailableSlots(slots);
  };

  useEffect(() => {
    if (showRequestModal && selectedAppointment && requestDate) {
      fetchAvailableSlots(selectedAppointment.doctor_id, requestDate);
    }
    // eslint-disable-next-line
  }, [showRequestModal, selectedAppointment, requestDate]);

  const renderRequestModal = () => {
    return (
      <Modal
        visible={showRequestModal}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Choose new date and time</Text>
            <View style={styles.formGroup}>
                              <Text style={styles.label}>Date</Text>
              <TouchableOpacity
                style={styles.dateTimeButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={styles.dateTimeButtonText}>
                  {requestDate.toLocaleDateString()}
                </Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={requestDate}
                  mode="date"
                  display="default"
                  onChange={(event, date) => {
                    setShowDatePicker(false);
                    if (date) {
                      setRequestDate(date);
                    }
                  }}
                />
              )}
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Available time</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                                  {availableSlots.length === 0 && <Text style={{ color: '#888' }}>No available time slots</Text>}
                {availableSlots.map(slot => (
                  <TouchableOpacity
                    key={slot.toISOString()}
                    style={{
                      backgroundColor: selectedSlot?.toISOString() === slot.toISOString() ? '#4A67E3' : '#fff',
                      borderColor: selectedSlot?.toISOString() === slot.toISOString() ? '#4A67E3' : '#E0E8F9',
                      borderWidth: 2,
                      borderRadius: 10,
                      marginRight: 8,
                      marginBottom: 8,
                      minWidth: 70,
                      paddingVertical: 8,
                      paddingHorizontal: 12,
                      alignItems: 'center',
                    }}
                    onPress={() => setSelectedSlot(slot)}
                  >
                    <Text style={{
                      color: selectedSlot?.toISOString() === slot.toISOString() ? '#fff' : '#4A67E3',
                      fontWeight: 'bold',
                      fontSize: 15,
                    }}>
                      {slot.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  {
                    borderWidth: 2,
                    borderColor: '#4A67E3',
                    backgroundColor: 'transparent',
                    borderRadius: 10,
                    paddingVertical: 12,
                    paddingHorizontal: 24,
                    marginRight: 8,
                  },
                ]}
                onPress={() => {
                  setShowRequestModal(false);
                  setRequestDate(new Date());
                  setAvailableSlots([]);
                  setSelectedSlot(null);
                }}
              >
                <Text style={{ color: '#4A67E3', fontWeight: 'bold', fontSize: 16 }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton]}
                onPress={() => {
                  if (!selectedSlot) {
                    Alert.alert('Please select an available time slot!');
                    return;
                  }
                  handleRequestNewDate(selectedAppointment?.id, selectedAppointment?.doctor_id, selectedSlot);
                }}
              >
                <Text style={styles.buttonText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const renderAppointmentItem = ({ item }) => {
    // Debug: log appointment data to see available fields
    if (item.requested_by) {
      console.log('🔍 Appointment with requested_by:', {
        id: item.id,
        status: item.status,
        requested_by: item.requested_by,
        requested_date_change: item.requested_date_change,
        reschedule_requested: item.reschedule_requested,
        allFields: Object.keys(item)
      });
    }
    
    const appointmentDate = new Date(item.appointment_datetime);
    const oneHourAfter = new Date(appointmentDate.getTime() + 60 * 60 * 1000);
    const fiveHoursAfter = new Date(appointmentDate.getTime() + 5 * 60 * 60 * 1000);
    const now = new Date();
    const isUpcoming = appointmentDate > now && oneHourAfter > now;
    const isPast = appointmentDate <= now;
    const isPastFiveHours = fiveHoursAfter <= now;
    
    const patientName = item.users?.fullname || item.users?.name || item.users?.email?.split('@')[0] || 'Patient';
    const doctorName = item.is_custom_appointment && item.custom_doctor_name 
      ? item.custom_doctor_name 
      : (item.doctors?.fullname || item.doctors?.name || item.doctors?.user?.fullname || 'Doctor');

    const getStatusMessage = () => {
      if (item.status === 'no-show') {
        return 'Patient did not show up';
      } else if (item.status === 'cancelled') {
        return 'Appointment was cancelled';
      } else if (isPast && item.status === 'confirmed') {
        return 'Time available to write report and prescription';
      } else if (isUpcoming && item.status === 'confirmed') {
        return 'Appointment confirmed';
      } else if (isPast) {
        return 'This appointment has passed';
      }
      return '';
    };

    // Add a function to check if appointment is rateable
    const isRateable = (item) => {
      if (item.status === 'cancelled') return false;
      if (doctorRatingsForUser[item.id]) return false;
      const appointmentDate = new Date(item.appointment_datetime);
      const oneHourAfter = new Date(appointmentDate.getTime() + 60 * 60 * 1000);
      const now = new Date();
      return now > oneHourAfter;
    };

    // Add a function to check if appointment is actually cancelled
    const isActuallyCancelled = (item) => {
      if (item.status === 'cancelled') return true;
      if (item.notes && item.notes.toLowerCase().includes('cancelado')) return true;
      return false;
    };

    return (
      <View style={styles.appointmentCard}>
        <View style={styles.appointmentInfo}>
          {isMedic ? (
            <Text style={styles.patientName}>{patientName}</Text>
          ) : (
            <Text style={styles.doctorName}>Dr(a). {doctorName}</Text>
          )}
          <Text style={styles.appointmentDate}>
            {appointmentDate.toLocaleDateString()}
          </Text>
          <Text style={styles.appointmentTime}>
            {appointmentDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {oneHourAfter.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
          {item.location && (
            <Text style={styles.location}>Location: {item.location}</Text>
          )}
          {item.is_custom_appointment && (
            <View style={{ marginTop: 4 }}>
              {item.custom_doctor_specialty && (
                <Text style={[styles.location, { color: '#666' }]}>
                  Specialty: {item.custom_doctor_specialty}
                </Text>
              )}
              {item.custom_doctor_phone && (
                <Text style={[styles.location, { color: '#666' }]}>
                  Phone: {item.custom_doctor_phone}
                </Text>
              )}
              <Text style={[styles.location, { color: '#4a67e3', fontWeight: '600' }]}>
                Custom Appointment
              </Text>
            </View>
          )}
          <Text style={[styles.status, { 
            color: item.status === 'no-show' ? '#e74c3c' : 
                   item.status === 'cancelled' ? '#e74c3c' :
                   isPast && item.status === 'confirmed' ? '#2ecc71' :
                   isUpcoming && item.status === 'confirmed' ? '#3498db' :
                   '#e74c3c'
          }]}>
            {getStatusMessage()}
          </Text>
          {item.requested_by && (
            <Text style={styles.requestedBy}>
              Requested by: {doctorName}
            </Text>
          )}
          {item.requested_date_change && (
            <Text style={styles.requestedDateChange}>
              Date change requested: {new Date(item.requested_date_change).toLocaleString()}
            </Text>
          )}
          
          {/* Show response buttons for date change requests */}
          {(item.requested_date_change || item.reschedule_requested) && isMedic && (
            <View style={styles.dateChangeResponseButtons}>
              <TouchableOpacity
                style={[styles.responseButton, styles.acceptButton]}
                onPress={() => handleAcceptDateChange(item.id, item.requested_date_change || item.reschedule_requested)}
              >
                <Ionicons name="checkmark" size={16} color="#fff" />
                <Text style={styles.responseButtonText}>Accept</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.responseButton, styles.rejectButton]}
                onPress={() => handleRejectDateChange(item.id)}
              >
                <Ionicons name="close" size={16} color="#fff" />
                <Text style={styles.responseButtonText}>Reject</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.responseButton, styles.rescheduleButton]}
                onPress={() => {
                  setSelectedAppointment(item);
                  setShowRequestModal(true);
                }}
              >
                <Ionicons name="calendar" size={16} color="#fff" />
                <Text style={styles.responseButtonText}>Reschedule</Text>
              </TouchableOpacity>
            </View>
          )}
          {item.charged_value && (
            <Text style={styles.chargedValue}>
              Charged Value: ${item.charged_value}
            </Text>
          )}
          {item.notes && (
            <Text style={styles.reportText}>
              Report: {item.notes}
            </Text>
          )}
          {isRateable(item) && !isActuallyCancelled(item) && (
            <TouchableOpacity
              style={{ position: 'absolute', top: 12, right: 12, zIndex: 10 }}
              onPress={() => {
                setRatedAppointmentId(item.id);
                setShowRatingModal(true);
              }}
            >
              <Ionicons name="star-outline" size={28} color="#FFD700" />
            </TouchableOpacity>
          )}
          {isActuallyCancelled(item) && (
            <View style={{ position: 'absolute', top: 12, right: 12, zIndex: 10, backgroundColor: '#e74c3c', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 13 }}>Cancelada</Text>
            </View>
          )}
        </View>
        <View style={styles.buttonContainer}>
          {/* Show accept/reject/reschedule buttons only for pending/scheduled appointments */}
          {(item.status === 'scheduled' || item.status === 'pending') && !item.requested_date_change && !item.reschedule_requested && (
            <View style={{ flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center', gap: 10 }}>
              <TouchableOpacity
                style={[styles.iconButton, { backgroundColor: 'transparent', elevation: 0, shadowOpacity: 0 }]}
                onPress={() => handleAcceptAppointment(item.id)}
                activeOpacity={0.7}
              >
                <Ionicons name="checkmark-circle" size={28} color="#4A67E3" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.iconButton, { backgroundColor: 'transparent', elevation: 0, shadowOpacity: 0 }]}
                onPress={() => handleRejectAppointment(item.id)}
                activeOpacity={0.7}
              >
                <Ionicons name="close-circle" size={28} color="#4A67E3" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.iconButton, { backgroundColor: 'transparent', elevation: 0, shadowOpacity: 0 }]}
                onPress={() => {
                  setSelectedAppointment(item);
                  setShowRequestModal(true);
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="time" size={28} color="#4A67E3" />
              </TouchableOpacity>
            </View>
          )}
          
          {/* Show report button only after appointment time has passed and appointment is confirmed */}
          {item.status === 'confirmed' && isPast && (
            <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
              <TouchableOpacity
                style={[styles.iconButton, { backgroundColor: 'transparent', elevation: 0, shadowOpacity: 0 }]}
                onPress={() => {
                  setEditingAppointment(item);
                  setReportModalVisible(true);
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="document-text" size={28} color="#4A67E3" />
              </TouchableOpacity>
            </View>
          )}
          {/* Remove the old complex button container as we have simplified logic above */}
        </View>
      </View>
    );
  };

  // Add new handlers for response buttons
  const handleAcceptAppointment = async (appointmentId) => {
    try {
      const result = await AppointmentService.updateAppointmentStatus(
        appointmentId,
        'confirmed',
        isMedic ? userId : userId // Set requested_by to current user
      );
      if (result.success) {
        fetchAppointments();
      }
    } catch (error) {
      console.error('Error accepting appointment:', error);
    }
  };

  const handleRejectAppointment = async (appointmentId) => {
    try {
      const result = await AppointmentService.updateAppointmentStatus(
        appointmentId,
        'rejected',
        isMedic ? userId : userId // Set requested_by to current user
      );
      if (result.success) {
        fetchAppointments();
      }
    } catch (error) {
      console.error('Error rejecting appointment:', error);
    }
  };

  // Add handlers for date change responses
  const handleAcceptDateChange = async (appointmentId, newDateTime) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ 
          appointment_datetime: newDateTime,
          requested_date_change: null,
          status: 'confirmed'
        })
        .eq('id', appointmentId);
      
      if (error) throw error;
      
      Alert.alert('Success', 'Date change accepted and appointment confirmed.');
      fetchAppointments();
    } catch (error) {
      console.error('Error accepting date change:', error);
      Alert.alert('Error', 'Failed to accept date change.');
    }
  };

  const handleRejectDateChange = async (appointmentId) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ 
          requested_date_change: null,
          status: 'confirmed' // Keep original appointment
        })
        .eq('id', appointmentId);
      
      if (error) throw error;
      
      Alert.alert('Success', 'Date change rejected. Original appointment maintained.');
      fetchAppointments();
    } catch (error) {
      console.error('Error rejecting date change:', error);
      Alert.alert('Error', 'Failed to reject date change.');
    }
  };

  // Update the button press handlers
  const handleChangeTimePress = (appointmentId) => {
    setSelectedAppointmentId(appointmentId);
    setShowRequestModal(true);
  };

  // Modify the report modal to include charged value
  const renderReportModal = () => {
    if (!editingAppointment) return null;
    // Controla a editabilidade do modal: true se for um médico e isReportEditable estiver ativo
    const isReportAllowedToEdit = isMedic && isReportEditable;

    return (
      <Modal
        visible={reportModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setReportModalVisible(false);
          setReportText('');
          setChargedValue('');
          setReportType('normal');
          setIsReportEditable(false); // Resetar estado de edição
        }}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {isReportAllowedToEdit ? 'Editar Relatório' : 'Ver Relatório'}
            </Text>
            
            {reportType !== 'normal' && (
              <Text style={styles.modalMessage}>
                {reportType === 'completed' ? 'Adicione um relatório para esta consulta concluída.' :
                 reportType === 'no-show' ? 'Adicione notas para o não comparecimento do paciente.' : ''}
              </Text>
            )}
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Relatório</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={reportText}
                onChangeText={setReportText}
                placeholder="Insira os detalhes do relatório..."
                multiline
                numberOfLines={4}
                editable={isReportAllowedToEdit} // Controla a editabilidade do TextInput
              />
            </View>

            {(reportType === 'no-show' || reportType === 'cancelled') && (
              <View style={styles.formGroup}>
                <Text style={styles.label}>Valor Cobrado ($)</Text>
                <TextInput
                  style={styles.input}
                  value={chargedValue}
                  onChangeText={setChargedValue}
                  placeholder="Insira o valor cobrado"
                  keyboardType="numeric"
                  editable={isReportAllowedToEdit} // Controla a editabilidade do TextInput
                />
              </View>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setReportModalVisible(false);
                  setReportText('');
                  setChargedValue('');
                  setReportType('normal');
                  setIsReportEditable(false); // Resetar estado de edição
                }}
              >
                <Text style={[styles.buttonText, { color: '#333' }]}>Cancelar</Text>
              </TouchableOpacity>
              {isReportAllowedToEdit && (
              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton]}
                onPress={() => {
                    // Se o tipo de relatório não for 'normal', a mudança de status já é tratada
                    // Caso contrário, significa que é uma edição de relatório normal sem mudança de status
                    const newStatus = (reportType === 'normal') ? editingAppointment.status : reportType;
                    const newChargedValue = (reportType === 'normal') ? (editingAppointment.charged_value || 0) : (parseFloat(chargedValue) || 0);
                    handleUpdateAppointmentStatus(newStatus, newChargedValue);
                }}
              >
                  <Text style={styles.buttonText}>Salvar</Text>
              </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  // Add new function to handle appointment status update with charged value
  const handleUpdateAppointmentStatus = async (status, value) => {
    if (!editingAppointment) return;
    try {
      setLoading(true);
      const { error } = await supabase
        .from('appointments')
        .update({ 
          status: status,
          charged_value: parseFloat(value) || 0,
          notes: reportText
        })
        .eq('id', editingAppointment.id);
      
      if (error) throw error;
      
      setReportModalVisible(false);
      setEditingAppointment(null);
      setReportText('');
      setChargedValue('');
      setReportType('normal');
      fetchAppointments();
      if (!isMedic && status === 'completed') {
        setRatedAppointmentId(editingAppointment.id);
        setShowRatingModal(true);
      }
      Alert.alert('Sucesso', `Consulta marcada como ${status === 'completed' ? 'concluída' : status === 'no-show' ? 'não compareceu' : 'atualizada'}.`);
    } catch (error) {
      Alert.alert('Erro', 'Falha ao atualizar status da consulta.');
    } finally {
      setLoading(false);
    }
  };

  const renderCancelModal = () => {
    if (!selectedAppointment) return null;
    return (
      <Modal
        visible={showCancelModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCancelModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Cancelar Consulta</Text>
            <Text style={styles.modalMessage}>
              Tem certeza que deseja cancelar esta consulta? Por favor, forneça um motivo.
            </Text>
            <TextInput
              style={styles.modalTextInput}
              placeholder="Motivo do cancelamento..."
              multiline
              numberOfLines={4}
              value={cancelReason}
              onChangeText={setCancelReason}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => {
                  setShowCancelModal(false);
                  setCancelReason('');
                  setSelectedAppointment(null);
                }}
              >
                <Text style={styles.modalButtonText}>Voltar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalConfirmCancelButton]}
                onPress={handleCancelConfirmation}
              >
                <Text style={styles.modalButtonText}>Confirmar Cancelamento</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  // Rating Modal
  const renderRatingModal = () => (
    <Modal
      visible={showRatingModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowRatingModal(false)}
    >
      <TouchableOpacity
        activeOpacity={1}
        style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)' }}
        onPressOut={() => setShowRatingModal(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={{ backgroundColor: '#fff', borderRadius: 20, padding: 28, width: '85%', alignItems: 'center' }}
          onPress={() => {}}
        >
          <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 18 }}>Avalie o Médico</Text>
          <View style={{ flexDirection: 'row', marginBottom: 18 }}>
            {[1,2,3,4,5].map(star => (
              <TouchableOpacity key={star} onPress={() => setRating(star)}>
                <Ionicons name={star <= rating ? 'star' : 'star-outline'} size={36} color={star <= rating ? '#FFD700' : '#ccc'} style={{ marginHorizontal: 4 }} />
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            style={{ width: '100%', minHeight: 60, borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 10, padding: 10, marginBottom: 18, fontSize: 16 }}
            placeholder="Deixe um comentário (opcional)"
            value={ratingComment}
            onChangeText={setRatingComment}
            multiline
          />
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 18 }}>
            <TouchableOpacity
              onPress={() => setIsAnonymous(!isAnonymous)}
              style={{ marginRight: 8, width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#6A8DFD', alignItems: 'center', justifyContent: 'center', backgroundColor: isAnonymous ? '#6A8DFD' : '#fff' }}
            >
              {isAnonymous && <Ionicons name="checkmark" size={16} color="#fff" />}
            </TouchableOpacity>
            <Text style={{ fontSize: 16, color: '#333' }}>Avaliar como anônimo</Text>
          </View>
          <TouchableOpacity
            style={{ backgroundColor: '#6A8DFD', borderRadius: 10, paddingVertical: 12, paddingHorizontal: 40, width: '100%' }}
            onPress={async () => {
              if (rating === 0) {
                Alert.alert('Por favor, selecione uma nota.');
                return;
              }
              // Save rating to doctor_ratings table
              await supabase.from('doctor_ratings').insert({
                appointment_id: ratedAppointmentId,
                doctor_id: appointments.find(a => a.id === ratedAppointmentId)?.doctor_id,
                user_id: userId,
                rating,
                comment: ratingComment,
                is_anonymous: isAnonymous
              });
              setShowRatingModal(false);
              setRating(0);
              setRatingComment('');
              setRatedAppointmentId(null);
              Alert.alert('Obrigado!', 'Sua avaliação foi registrada.');
            }}
          >
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 17, textAlign: 'center' }}>Enviar Avaliação</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
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
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
      <View style={{ flex: 1 }}>
        {/* Minimal Header with Back Button */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, backgroundColor: '#f5f5f5' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 12 }}>
              <Ionicons name="arrow-back" size={28} color="#4a67e3" />
            </TouchableOpacity>
            <Text style={{ fontSize: 22, fontWeight: '700', color: '#222' }}>Appointments</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {!isMedic && (
              <TouchableOpacity 
                style={{ 
                  backgroundColor: '#4a67e3', 
                  borderRadius: 20, 
                  paddingHorizontal: 12, 
                  paddingVertical: 6,
                  flexDirection: 'row',
                  alignItems: 'center'
                }} 
                onPress={() => navigation.navigate('AddCustomAppointment')}
              >
                <Ionicons name="add" size={16} color="#fff" />
                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600', marginLeft: 4 }}>Custom</Text>
              </TouchableOpacity>
            )}
            {isMedic && userDoctorData && (
              <TouchableOpacity style={{ marginLeft: 8 }} onPress={() => navigation.navigate('RequestAppointmentScreen', { doctor: userDoctorData })}>
                <Ionicons name="add-circle-outline" size={28} color="#4a67e3" />
              </TouchableOpacity>
            )}
          </View>
        </View>
        {/* Filter Chips */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 2, marginBottom: 8, gap: 8 }}>
          {FILTERS.map(f => (
            <TouchableOpacity
              key={f.value}
              style={{
                backgroundColor: filter === f.value ? '#4a67e3' : '#e9ecf4',
                borderRadius: 16,
                paddingHorizontal: 16,
                paddingVertical: 7,
                marginHorizontal: 2,
              }}
              onPress={() => setFilter(f.value)}
            >
              <Text style={{ color: filter === f.value ? '#fff' : '#4a67e3', fontWeight: '600', fontSize: 14 }}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {/* Appointments List */}
        <View style={{ flex: 1, marginTop: 2 }}>
          {loading ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <ActivityIndicator size="large" color="#4a67e3" />
            </View>
          ) : appointments.length === 0 ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Ionicons name="calendar-outline" size={64} color="#bdc3c7" />
              <Text style={{ color: '#aaa', fontSize: 16, marginTop: 10 }}>No appointments found.</Text>
          </View>
        ) : (
          <FlatList
            data={appointments}
            keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 8, paddingBottom: 120 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
              renderItem={renderAppointmentItem}
            />
          )}
          {/* Modal for editing report */}
          {renderReportModal()}
        </View>
        <Navbar navigation={navigation} />
      </View>
      {renderRequestModal()}
      {renderCancelModal()}
      {renderRatingModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  filterContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 4,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  activeFilter: {
    backgroundColor: '#4F8CFF',
  },
  filterText: {
    fontSize: 14,
    color: '#666',
  },
  activeFilterText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  appointmentCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  appointmentInfo: {
    flex: 1,
    marginRight: 12,
  },
  patientName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  doctorName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  appointmentDate: {
    fontSize: 15,
    color: '#555',
    marginBottom: 4,
  },
  appointmentTime: {
    fontSize: 15,
    color: '#555',
    marginBottom: 4,
  },
  location: {
    fontSize: 15,
    color: '#555',
    marginBottom: 4,
  },
  status: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 8,
  },
  requestedBy: {
    fontSize: 13,
    color: '#6a7a8c',
    marginTop: 4,
  },
  requestedDateChange: {
    fontSize: 13,
    color: '#8a99a8',
    marginTop: 2,
  },
  buttonContainer: {
    justifyContent: 'center',
  },
  verticalButtonContainer: {
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
  },
  rejectButton: {
    backgroundColor: '#f44336',
  },
  changeTimeButton: {
    backgroundColor: '#e3f2fd',
  },
  confirmButton: {
    backgroundColor: '#e8f5e9',
  },
  cancelButton: {
    backgroundColor: '#ffebee',
  },
  completeButton: {
    backgroundColor: '#e3f2fd',
  },
  editReportButton: {
    backgroundColor: '#fff3e0',
  },
  rescheduleButton: {
    backgroundColor: '#2196F3',
  },
  viewReportButton: {
    backgroundColor: '#e3f2fd',
  },
  requestNewDateButton: {
    backgroundColor: '#fff3e0',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  formGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 5,
  },
  submitButton: {
    backgroundColor: '#4F8CFF',
  },
  buttonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
  },
  noShowButton: {
    backgroundColor: '#ffebee',
  },
  chargedValue: {
    fontSize: 15,
    color: '#2ecc71',
    fontWeight: 'bold',
    marginTop: 4,
  },
  reportText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    fontStyle: 'italic',
  },
  // Novos estilos para o modal de cancelamento
  modalConfirmCancelButton: {
    backgroundColor: '#e74c3c',
  },
  patientActionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 15,
  },
  modalMessage: {
    color: '#666',
    marginBottom: 15,
  },
  modalTextInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
  },
  modalCancelButton: {
    backgroundColor: '#e9ecf4',
  },
  modalButtonText: {
    color: '#333',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 16,
  },
  actionButton: {
    backgroundColor: '#e74c3c',
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 5,
  },
  actionButtonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 15,
  },
  listContent: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 30,
  },
  // Novo estilo para o botão de alteração de data
  changeDateButton: {
    backgroundColor: '#3498db', // Cor para 'Alterar Data'
    padding: 10,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginHorizontal: 5,
  },
  // Styles for date change response buttons
  dateChangeResponseButtons: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 6,
  },
  responseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
  },
  responseButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
    marginLeft: 4,
  },
});

function getStatusColor(status) {
  switch (status) {
    case 'scheduled':
      return '#f1c40f';
    case 'confirmed':
      return '#2ecc71';
    case 'cancelled':
      return '#e74c3c';
    case 'completed':
      return '#3498db';
    default:
      return '#95a5a6';
  }
}

export default AppointmentsScreen; 