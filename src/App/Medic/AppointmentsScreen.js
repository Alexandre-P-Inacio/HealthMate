import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Alert, SafeAreaView, Platform, StatusBar, TouchableOpacity, RefreshControl, Modal, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DoctorAppointmentService from '../../services/DoctorAppointmentService';
import { AppointmentService } from '../../services/AppointmentService';
import DataUser from '../../../navigation/DataUser';
import Navbar from '../../Components/Navbar';
import supabase from '../../../supabase';
import DateTimePicker from '@react-native-community/datetimepicker';

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

  useEffect(() => {
    const currentUser = DataUser.getUserData();
    if (currentUser && currentUser.id) {
      setUserId(currentUser.id);
      setIsMedic(currentUser.role === 'medic');
    } else {
      Alert.alert('Error', 'User not logged in.');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (userId) {
      fetchAppointments();
    }
    // eslint-disable-next-line
  }, [userId, filter]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      let data = [];
      if (isMedic) {
        const res = await AppointmentService.getDoctorAppointments(userId);
        if (res.success) data = res.data;
        // Fallback: fetch user data if missing
        for (let apt of data) {
          if (!apt.users || !apt.users.fullname) {
            const { data: userData } = await supabase
              .from('users')
              .select('fullname')
              .eq('id', apt.user_id)
              .single();
            if (userData && userData.fullname) {
              apt.users = { fullname: userData.fullname };
            }
          }
        }
      } else {
        const res = await AppointmentService.getUserAppointments(userId);
        if (res.success) data = res.data;
        // Fallback: fetch doctor data if missing
        for (let apt of data) {
          if (!apt.doctors || !apt.doctors.fullname) {
            const { data: doctorData } = await supabase
              .from('doctors')
              .select('fullname')
              .eq('id', apt.doctor_id)
              .single();
            if (doctorData && doctorData.fullname) {
              apt.doctors = { fullname: doctorData.fullname };
            }
          }
        }
      }
      setAppointments(applyFilter(data, filter));
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
        return data.filter(a => new Date(a.appointment_datetime) > now && a.status !== 'cancelled');
      case 'past':
        return data.filter(a => new Date(a.appointment_datetime) <= now && a.status !== 'cancelled');
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

  const handleSaveReport = async () => {
    if (!editingAppointment) return;
    try {
      setLoading(true);
      const { error } = await supabase
        .from('appointments')
        .update({ notes: reportText })
        .eq('id', editingAppointment.id);
      if (error) throw error;
      setReportModalVisible(false);
      setEditingAppointment(null);
      setReportText('');
      fetchAppointments();
      Alert.alert('Success', 'Report saved!');
    } catch (error) {
      Alert.alert('Error', 'Failed to save report.');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestNewDate = async (appointmentId, doctorId) => {
    try {
      const result = await AppointmentService.requestDateChange(
        appointmentId,
        requestDate,
        isMedic ? doctorId : userId
      );
      if (result.success) {
        setShowRequestModal(false);
        setRequestDate(new Date());
        setRequestLocation('');
        setRequestNotes('');
        fetchAppointments();
      }
    } catch (error) {
      console.error('Error requesting new date:', error);
    }
  };

  const renderRequestModal = () => {
    return (
      <Modal
        visible={showRequestModal}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Request New Date</Text>
            
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
                      // Preserve the current time when changing date
                      const newDate = new Date(date);
                      newDate.setHours(requestDate.getHours());
                      newDate.setMinutes(requestDate.getMinutes());
                      setRequestDate(newDate);
                    }
                  }}
                />
              )}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Time</Text>
              <TouchableOpacity 
                style={styles.dateTimeButton}
                onPress={() => setShowTimePicker(true)}
              >
                <Text style={styles.dateTimeButtonText}>
                  {requestDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </TouchableOpacity>
              {showTimePicker && (
                <DateTimePicker
                  value={requestDate}
                  mode="time"
                  is24Hour={true}
                  display="default"
                  onChange={(event, time) => {
                    setShowTimePicker(false);
                    if (time) {
                      // Preserve the current date when changing time
                      const newDate = new Date(requestDate);
                      newDate.setHours(time.getHours());
                      newDate.setMinutes(time.getMinutes());
                      setRequestDate(newDate);
                    }
                  }}
                />
              )}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Location</Text>
              <TextInput
                style={styles.input}
                value={requestLocation}
                onChangeText={setRequestLocation}
                placeholder="Enter location"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={requestNotes}
                onChangeText={setRequestNotes}
                placeholder="Add any notes"
                multiline
                numberOfLines={4}
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowRequestModal(false);
                  setRequestDate(new Date());
                  setRequestLocation('');
                  setRequestNotes('');
                }}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton]}
                onPress={() => handleRequestNewDate(selectedAppointment?.id, selectedAppointment?.doctor_id)}
              >
                <Text style={styles.buttonText}>Submit Request</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const renderAppointmentItem = ({ item }) => {
    const appointmentDate = new Date(item.appointment_datetime);
    const isUpcoming = new Date(item.appointment_datetime) > new Date();
    const canConfirm = isMedic && (item.status === 'pending' || item.status === 'requested') && isUpcoming;
    const canCancel = isMedic && (item.status === 'pending' || item.status === 'requested') && isUpcoming;
    const canComplete = isMedic && item.status === 'confirmed' && isUpcoming;
    const canEditReport = isMedic && item.status === 'completed';
    const canReschedule = isMedic && item.status === 'confirmed' && isUpcoming;
    const canViewReport = !isMedic && item.status === 'completed';
    const canRequestNewDate = !isMedic && item.status === 'scheduled' && isUpcoming;
    
    // Check if current user should see response buttons
    const shouldShowResponseButtons = item.status === 'scheduled' && item.requested_by && item.requested_by !== (isMedic ? item.doctor_id : item.user_id);
    
    const patientName = item.users?.fullname || item.users?.name || 'N/A';
    const doctorName = item.doctors?.name || 'N/A';
    let requestedByName = 'N/A';
    if (item.requested_by) {
      if (item.requested_by === item.user_id) {
        requestedByName = patientName;
      } else if (item.requested_by === item.doctor_id) {
        requestedByName = doctorName;
      }
    }

    return (
      <View style={styles.appointmentCard}>
        <Text style={styles.doctorName}>
          {isMedic ? `Paciente: ${patientName}` : `Dr. ${doctorName}`}
        </Text>
        {item.requested_by && (
          <Text style={styles.requestedBy}>
            Solicitado por: {requestedByName}
          </Text>
        )}
        {item.requested_date_change && (
          <Text style={styles.requestedDateChange}>
            Nova data/hora solicitada: {new Date(item.requested_date_change).toLocaleString()}
          </Text>
        )}
        <Text style={styles.appointmentDate}>Date: {appointmentDate.toDateString()}</Text>
        <Text style={styles.appointmentTime}>Time: {appointmentDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
        <Text style={styles.location}>Location: {item.location}</Text>
        <Text style={styles.status}>Status: {item.status}</Text>
        
        {/* Response buttons when someone else requested */}
        {shouldShowResponseButtons && (
          <View style={styles.verticalButtonContainer}>
            <TouchableOpacity 
              style={[styles.iconButton, styles.acceptButton]}
              onPress={() => handleAcceptAppointment(item.id)}
              activeOpacity={0.7}
            >
              <Ionicons name="checkmark-circle" size={24} color="#4F8CFF" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.iconButton, styles.rejectButton]}
              onPress={() => handleRejectAppointment(item.id)}
              activeOpacity={0.7}
            >
              <Ionicons name="close-circle" size={24} color="#F87171" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.iconButton, styles.changeTimeButton]}
              onPress={() => {
                setSelectedAppointment(item);
                setShowRequestModal(true);
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="time" size={24} color="#60A5FA" />
            </TouchableOpacity>
          </View>
        )}

        {/* Regular action buttons */}
        {!shouldShowResponseButtons && (
          <View style={styles.verticalButtonContainer}>
            {canConfirm && (
              <TouchableOpacity 
                style={[styles.iconButton, styles.confirmButton]}
                onPress={() => handleStatusChange(item.id, 'confirmed')}
                activeOpacity={0.7}
              >
                <Ionicons name="checkmark-circle" size={24} color="#4F8CFF" />
              </TouchableOpacity>
            )}
            {canCancel && (
              <TouchableOpacity 
                style={[styles.iconButton, styles.cancelButton]}
                onPress={() => handleStatusChange(item.id, 'cancelled')}
                activeOpacity={0.7}
              >
                <Ionicons name="close-circle" size={24} color="#F87171" />
              </TouchableOpacity>
            )}
            {canComplete && (
              <TouchableOpacity 
                style={[styles.iconButton, styles.completeButton]}
                onPress={() => handleStatusChange(item.id, 'completed')}
                activeOpacity={0.7}
              >
                <Ionicons name="checkmark-done" size={24} color="#4F8CFF" />
              </TouchableOpacity>
            )}
            {canEditReport && (
              <TouchableOpacity 
                style={[styles.iconButton, styles.editReportButton]}
                onPress={() => {
                  setEditingAppointment(item);
                  setReportText(item.notes || '');
                  setReportModalVisible(true);
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="create" size={24} color="#4F8CFF" />
              </TouchableOpacity>
            )}
            {canReschedule && (
              <TouchableOpacity 
                style={[styles.iconButton, styles.rescheduleButton]}
                onPress={() => handleStatusChange(item.id, 'confirmed')}
                activeOpacity={0.7}
              >
                <Ionicons name="calendar" size={24} color="#4F8CFF" />
              </TouchableOpacity>
            )}
            {canViewReport && (
              <TouchableOpacity 
                style={[styles.iconButton, styles.viewReportButton]}
                onPress={() => handleStatusChange(item.id, 'completed')}
                activeOpacity={0.7}
              >
                <Ionicons name="document-text" size={24} color="#4F8CFF" />
              </TouchableOpacity>
            )}
            {canRequestNewDate && (
              <TouchableOpacity 
                style={[styles.iconButton, styles.requestNewDateButton]}
                onPress={() => {
                  setSelectedAppointment(item);
                  setShowRequestModal(true);
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="time" size={24} color="#60A5FA" />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  };

  // Add new handlers for response buttons
  const handleAcceptAppointment = async (appointmentId) => {
    try {
      const result = await AppointmentService.updateAppointmentStatus(
        appointmentId,
        'confirmed',
        isMedic ? doctorId : userId // Set requested_by to current user
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
        isMedic ? doctorId : userId // Set requested_by to current user
      );
      if (result.success) {
        fetchAppointments();
      }
    } catch (error) {
      console.error('Error rejecting appointment:', error);
    }
  };

  // Update the button press handlers
  const handleChangeTimePress = (appointmentId) => {
    setSelectedAppointmentId(appointmentId);
    setShowRequestModal(true);
  };

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
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f7fafd' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#f7fafd" />
      <View style={{ flex: 1 }}>
        {/* Minimal Header with Back Button */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, backgroundColor: '#f7fafd' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 12 }}>
              <Ionicons name="arrow-back" size={28} color="#4a67e3" />
            </TouchableOpacity>
            <Text style={{ fontSize: 22, fontWeight: '700', color: '#222' }}>Consultas</Text>
          </View>
          {isMedic && (
            <TouchableOpacity style={{ marginLeft: 8 }} onPress={() => navigation.navigate('DoctorAppointmentRequest')}>
              <Ionicons name="add-circle-outline" size={28} color="#4a67e3" />
            </TouchableOpacity>
          )}
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
              <Text style={{ color: '#aaa', fontSize: 16, marginTop: 10 }}>Nenhuma consulta encontrada.</Text>
          </View>
        ) : (
          <FlatList
            data={appointments}
            keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 8, paddingBottom: 30 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
              renderItem={({ item }) => {
                const appointmentDate = new Date(item.appointment_datetime);
                const isUpcoming = new Date(item.appointment_datetime) > new Date();
                const canConfirm = isMedic && (item.status === 'pending' || item.status === 'requested') && isUpcoming;
                const canCancel = isMedic && (item.status === 'pending' || item.status === 'requested') && isUpcoming;
                const canComplete = isMedic && item.status === 'confirmed' && isUpcoming;
                const canEditReport = isMedic && item.status === 'completed';
                const canReschedule = isMedic && item.status === 'confirmed' && isUpcoming;
                const canViewReport = !isMedic && item.status === 'completed';
                const canRequestNewDate = !isMedic && item.status === 'scheduled' && isUpcoming;
                
                // Check if current user should see response buttons
                const shouldShowResponseButtons = item.status === 'scheduled' && item.requested_by && item.requested_by !== (isMedic ? item.doctor_id : item.user_id);
                
                const patientName = item.users?.fullname || item.users?.name || 'N/A';
                const doctorName = item.doctors?.name || 'N/A';
                let requestedByName = 'N/A';
                if (item.requested_by) {
                  if (item.requested_by === item.user_id) {
                    requestedByName = patientName;
                  } else if (item.requested_by === item.doctor_id) {
                    requestedByName = doctorName;
                  }
                }
                return (
                  <View style={{ backgroundColor: '#fff', borderRadius: 14, padding: 18, marginBottom: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 6, elevation: 1 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 16, fontWeight: '600', color: '#222' }}>{isMedic ? `Paciente: ${patientName}` : `Dr. ${doctorName}`}</Text>
                      {item.requested_by && (
                        <Text style={styles.requestedBy}>
                          Solicitado por: {requestedByName}
                        </Text>
                      )}
                      {item.requested_date_change && (
                        <Text style={styles.requestedDateChange}>
                          Nova data/hora solicitada: {new Date(item.requested_date_change).toLocaleString()}
                        </Text>
                      )}
                      <Text style={{ fontSize: 13, color: '#6a7a8c', marginTop: 2 }}>{appointmentDate.toLocaleDateString()} {appointmentDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                      <Text style={{ fontSize: 13, color: '#8a99a8', marginTop: 2 }}>{item.location}</Text>
                      {item.notes && <Text style={{ fontSize: 13, color: '#888', marginTop: 2 }}>{item.notes}</Text>}
                    </View>
                    <View style={{ alignItems: 'flex-end', marginLeft: 12 }}>
                      <View style={{ backgroundColor: getStatusColor(item.status), borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 6 }}>
                        <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>{item.status}</Text>
                      </View>
                      {shouldShowResponseButtons && (
                        <View style={styles.verticalButtonContainer}>
                          <TouchableOpacity 
                            style={[styles.iconButton, styles.acceptButton]}
                            onPress={() => handleAcceptAppointment(item.id)}
                            activeOpacity={0.7}
                          >
                            <Ionicons name="checkmark-circle" size={24} color="#4F8CFF" />
                          </TouchableOpacity>
                          <TouchableOpacity 
                            style={[styles.iconButton, styles.rejectButton]}
                            onPress={() => handleRejectAppointment(item.id)}
                            activeOpacity={0.7}
                          >
                            <Ionicons name="close-circle" size={24} color="#F87171" />
                          </TouchableOpacity>
                          <TouchableOpacity 
                            style={[styles.iconButton, styles.changeTimeButton]}
                            onPress={() => {
                              setSelectedAppointment(item);
                              setShowRequestModal(true);
                            }}
                            activeOpacity={0.7}
                          >
                            <Ionicons name="time" size={24} color="#60A5FA" />
                          </TouchableOpacity>
                        </View>
                      )}
                      {!shouldShowResponseButtons && (
                        <View style={styles.verticalButtonContainer}>
                          {canConfirm && (
                            <TouchableOpacity 
                              style={[styles.iconButton, styles.confirmButton]}
                              onPress={() => handleStatusChange(item.id, 'confirmed')}
                              activeOpacity={0.7}
                            >
                              <Ionicons name="checkmark-circle" size={24} color="#4F8CFF" />
                            </TouchableOpacity>
                          )}
                          {canCancel && (
                            <TouchableOpacity 
                              style={[styles.iconButton, styles.cancelButton]}
                              onPress={() => handleStatusChange(item.id, 'cancelled')}
                              activeOpacity={0.7}
                            >
                              <Ionicons name="close-circle" size={24} color="#F87171" />
                            </TouchableOpacity>
                          )}
                          {canComplete && (
                            <TouchableOpacity 
                              style={[styles.iconButton, styles.completeButton]}
                              onPress={() => handleStatusChange(item.id, 'completed')}
                              activeOpacity={0.7}
                            >
                              <Ionicons name="checkmark-done" size={24} color="#4F8CFF" />
                            </TouchableOpacity>
                          )}
                          {canEditReport && (
                            <TouchableOpacity 
                              style={[styles.iconButton, styles.editReportButton]}
                              onPress={() => {
                                setEditingAppointment(item);
                                setReportText(item.notes || '');
                                setReportModalVisible(true);
                              }}
                              activeOpacity={0.7}
                            >
                              <Ionicons name="create" size={24} color="#4F8CFF" />
                            </TouchableOpacity>
                          )}
                          {canReschedule && (
                            <TouchableOpacity 
                              style={[styles.iconButton, styles.rescheduleButton]}
                              onPress={() => handleStatusChange(item.id, 'confirmed')}
                              activeOpacity={0.7}
                            >
                              <Ionicons name="calendar" size={24} color="#4F8CFF" />
                            </TouchableOpacity>
                          )}
                          {canViewReport && (
                            <TouchableOpacity 
                              style={[styles.iconButton, styles.viewReportButton]}
                              onPress={() => handleStatusChange(item.id, 'completed')}
                              activeOpacity={0.7}
                            >
                              <Ionicons name="document-text" size={24} color="#4F8CFF" />
                            </TouchableOpacity>
                          )}
                          {canRequestNewDate && (
                            <TouchableOpacity 
                              style={[styles.iconButton, styles.requestNewDateButton]}
                              onPress={() => {
                                setSelectedAppointment(item);
                                setShowRequestModal(true);
                              }}
                              activeOpacity={0.7}
                            >
                              <Ionicons name="time" size={24} color="#60A5FA" />
                            </TouchableOpacity>
                          )}
                        </View>
                      )}
                    </View>
                  </View>
                );
              }}
            />
          )}
          {/* Modal for editing report */}
          <Modal
            visible={reportModalVisible}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setReportModalVisible(false)}
          >
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)' }}>
              <View style={{ backgroundColor: '#fff', padding: 22, borderRadius: 14, width: '90%' }}>
                <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 10 }}>Editar Relatório da Consulta</Text>
                <TextInput
                  style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, minHeight: 80, marginBottom: 15 }}
                  multiline
                  value={reportText}
                  onChangeText={setReportText}
                  placeholder="Digite o relatório/notas da consulta..."
                />
                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10 }}>
                  <TouchableOpacity onPress={() => setReportModalVisible(false)} style={{ marginRight: 10 }}>
                    <Text style={{ color: '#e74c3c', fontWeight: 'bold' }}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleSaveReport}>
                    <Text style={{ color: '#3498db', fontWeight: 'bold' }}>Salvar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        </View>
        <Navbar navigation={navigation} />
      </View>
      {renderRequestModal()}
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
    justifyContent: 'flex-start',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 16,
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 10,
    backgroundColor: '#fff',
    borderRadius: 10,
    marginHorizontal: 10,
    padding: 5,
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  activeFilterButton: {
    backgroundColor: '#3498db',
  },
  filterButtonText: {
    color: '#333',
    fontWeight: 'bold',
  },
  activeFilterButtonText: {
    color: '#fff',
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
  noDataText: {
    fontSize: 18,
    color: '#7f8c8d',
    marginTop: 10,
  },
  listContainer: {
    paddingHorizontal: 15,
    paddingTop: 10,
    paddingBottom: 20,
  },
  appointmentCard: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  doctorName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3498db',
    marginBottom: 5,
  },
  appointmentDate: {
    fontSize: 15,
    color: '#555',
    marginBottom: 3,
  },
  appointmentTime: {
    fontSize: 15,
    color: '#555',
    marginBottom: 3,
  },
  location: {
    fontSize: 15,
    color: '#555',
    marginBottom: 3,
  },
  status: {
    fontSize: 15,
    fontWeight: 'bold',
    marginTop: 5,
    color: '#2ecc71',
  },
  buttonContainer: {
    flexDirection: 'row',
    marginTop: 10,
    gap: 10,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  buttonText: {
    marginLeft: 6,
    fontWeight: 'bold',
    color: '#333',
  },
  acceptButton: {
    backgroundColor: '#2ecc71',
  },
  rejectButton: {
    backgroundColor: '#e74c3c',
  },
  changeTimeButton: {
    backgroundColor: '#4CAF50',
  },
  confirmButton: {
    backgroundColor: '#2ecc71',
  },
  cancelButton: {
    backgroundColor: '#e74c3c',
  },
  completeButton: {
    backgroundColor: '#3498db',
  },
  editReportButton: {
    backgroundColor: '#f0f0f0',
  },
  rescheduleButton: {
    backgroundColor: '#3498db',
  },
  viewReportButton: {
    backgroundColor: '#f0f0f0',
  },
  requestNewDateButton: {
    backgroundColor: '#f1c40f',
  },
  requestedBy: {
    fontSize: 13,
    color: '#6a7a8c',
    marginTop: 2,
  },
  requestedDateChange: {
    fontSize: 13,
    color: '#8a99a8',
    marginTop: 2,
  },
  verticalButtonContainer: {
    marginTop: 12,
    gap: 8,
    paddingHorizontal: 0,
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
    borderRadius: 5,
    padding: 10,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'column',
    gap: 8,
    marginTop: 16,
  },
  modalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    minHeight: 38,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: '#F3F6FA',
    shadowColor: 'transparent',
    elevation: 0,
    marginBottom: 0,
    marginTop: 0,
    marginHorizontal: 0,
    marginVertical: 0,
  },
  submitButton: {
    backgroundColor: '#4F8CFF', // azul principal
  },
  dateTimeButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 10,
    backgroundColor: '#f8f9fa',
  },
  dateTimeButtonText: {
    fontSize: 16,
    color: '#333',
  },
  iconButton: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderRadius: 16,
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 36,
    marginHorizontal: 2,
  },
  acceptButton: {},
  rejectButton: {},
  changeTimeButton: {},
  confirmButton: {},
  cancelButton: {},
  completeButton: {},
  editReportButton: {},
  rescheduleButton: {},
  viewReportButton: {},
  requestNewDateButton: {},
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