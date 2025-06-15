import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
  Modal,
} from 'react-native';
import { supabase } from '../../../supabase';
import { useAuth } from '../../context/AuthContext';
import { AppointmentService } from '../../services/AppointmentService';
import { Ionicons } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';

const DoctorAppointmentManagement = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [markedDates, setMarkedDates] = useState({});

  // Novos estados para o modal de resultado da consulta
  const [showOutcomeModal, setShowOutcomeModal] = useState(false);
  const [outcomeNotes, setOutcomeNotes] = useState('');
  const [selectedOutcomeStatus, setSelectedOutcomeStatus] = useState(null); // 'completed' ou 'no_show'

  useEffect(() => {
    fetchAppointments();
  }, [filter, selectedDate]);

  const fetchAppointments = async () => {
    try {
      const result = await AppointmentService.getDoctorAppointments(
        user.id,
        filter,
        selectedDate
      );

      if (!result.success) {
        throw new Error(result.error);
      }

      setAppointments(result.data);

      // Update calendar marked dates
      const dates = {};
      result.data.forEach(appointment => {
        const date = new Date(appointment.appointment_datetime).toISOString().split('T')[0];
        dates[date] = {
          marked: true,
          dotColor: getStatusColor(appointment.status)
        };
      });
      setMarkedDates(dates);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      Alert.alert('Erro', 'Não foi possível carregar as consultas.');
    } finally {
      setInitialLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: '#ffa726',
      approved: '#66bb6a',
      rejected: '#ef5350',
      completed: '#42a5f5',
      cancelled: '#bdbdbd',
      no_show: '#ff5722', // Cor para o status 'no_show'
      reschedule_requested: '#8e44ad', // Nova cor para solicitação de reagendamento
    };
    return colors[status] || '#bdbdbd';
  };

  const handleStatusUpdate = async (appointmentId, newStatus, notes = null) => {
    try {
      const result = await AppointmentService.updateAppointmentStatus(
        appointmentId,
        newStatus,
        user.id,
        notes // Passar as notas, se existirem
      );

      if (!result.success) {
        throw new Error(result.error);
      }

      await fetchAppointments();
      Alert.alert('Sucesso', 'Status da consulta atualizado com sucesso!');
    } catch (error) {
      console.error('Error updating appointment status:', error);
      Alert.alert('Erro', 'Não foi possível atualizar o status da consulta.');
    }
  };

  const handleCancelAppointment = async () => {
    if (!cancelReason.trim()) {
      Alert.alert('Erro', 'Por favor, forneça um motivo para o cancelamento.');
      return;
    }

    try {
      const result = await AppointmentService.cancelAppointment(
        selectedAppointment.id,
        user.id,
        cancelReason
      );

      if (!result.success) {
        throw new Error(result.error);
      }

      setShowCancelModal(false);
      setCancelReason('');
      setSelectedAppointment(null);
      await fetchAppointments();
      Alert.alert('Sucesso', 'Consulta cancelada com sucesso!');
    } catch (error) {
      console.error('Error canceling appointment:', error);
      Alert.alert('Erro', 'Não foi possível cancelar a consulta.');
    }
  };

  const handleOutcomeConfirmation = async () => {
    if (!selectedAppointment || !selectedOutcomeStatus) return;

    try {
      const result = await AppointmentService.updateAppointmentStatus(
        selectedAppointment.id,
        selectedOutcomeStatus,
        user.id,
        outcomeNotes // Passar as notas do resultado
      );

      if (!result.success) {
        throw new Error(result.error);
      }

      setShowOutcomeModal(false);
      setOutcomeNotes('');
      setSelectedOutcomeStatus(null);
      setSelectedAppointment(null);
      await fetchAppointments();
      Alert.alert('Sucesso', `Consulta marcada como ${selectedOutcomeStatus === 'completed' ? 'concluída' : 'não compareceu'}.`);
    } catch (error) {
      console.error('Error updating appointment outcome:', error);
      Alert.alert('Erro', 'Não foi possível atualizar o resultado da consulta.');
    }
  };

  const renderAppointmentCard = (appointment) => {
    const appointmentDate = new Date(appointment.appointment_datetime);
    const statusColor = getStatusColor(appointment.status);

    const getStatusMessage = () => {
      switch (appointment.status) {
        case 'pending':
          return 'Pendente';
        case 'approved':
          return 'Aprovada';
        case 'rejected':
          return 'Rejeitada';
        case 'completed':
          return 'Concluída';
        case 'cancelled':
          return 'Cancelada';
        case 'no_show':
          return 'Não Compareceu';
        case 'reschedule_requested':
          return 'Reagendamento Solicitado';
        default:
          return 'Desconhecido';
      }
    };

    return (
      <View key={appointment.id} style={styles.appointmentCard}>
        <View style={styles.appointmentHeader}>
          <View style={styles.patientInfo}>
            {appointment.users.photo_url ? (
              <Image
                source={{ uri: appointment.users.photo_url }}
                style={styles.patientPhoto}
              />
            ) : (
              <View style={[styles.patientPhotoPlaceholder, { backgroundColor: statusColor }]}>
                <Text style={styles.patientInitials}>
                  {appointment.users.fullname.split(' ').map(n => n[0]).join('')}
                </Text>
              </View>
            )}
            <View>
              <Text style={styles.patientName}>{appointment.users.fullname}</Text>
              <Text style={styles.appointmentTime}>
                <Ionicons name="time-outline" size={16} color="#666" />
                {' '}{appointmentDate.toLocaleTimeString()}
              </Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>{getStatusMessage()}</Text>
          </View>
        </View>

        <View style={styles.appointmentDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={20} color="#666" />
            <Text style={styles.detailText}>{appointment.location}</Text>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="call-outline" size={20} color="#666" />
            <Text style={styles.detailText}>{appointment.users.phone}</Text>
          </View>

          {appointment.notes && (
            <View style={styles.detailRow}>
              <Ionicons name="document-text-outline" size={20} color="#666" />
              <Text style={styles.detailText}>{appointment.notes}</Text>
            </View>
          )}
          {appointment.requested_date_change && appointment.status === 'reschedule_requested' && (
            <View style={styles.detailRow}>
              <Ionicons name="sync-circle-outline" size={20} color="#8e44ad" />
              <Text style={styles.detailText}>Nova Data Sugerida: {new Date(appointment.requested_date_change).toLocaleString()}</Text>
            </View>
          )}
        </View>

        {appointment.status === 'pending' && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.approveButton]}
              onPress={() => handleStatusUpdate(appointment.id, 'approved')}
            >
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>Aprovar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.rejectButton]}
              onPress={() => handleStatusUpdate(appointment.id, 'rejected')}
            >
              <Ionicons name="close-circle" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>Rejeitar</Text>
            </TouchableOpacity>
          </View>
        )}

        {appointment.status === 'approved' && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.completeButton]}
              onPress={() => {
                setSelectedAppointment(appointment);
                setSelectedOutcomeStatus('completed');
                setShowOutcomeModal(true);
              }}
            >
              <Ionicons name="checkmark-done-circle" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>Concluir</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.noShowButton]}
              onPress={() => {
                setSelectedAppointment(appointment);
                setSelectedOutcomeStatus('no_show');
                setShowOutcomeModal(true);
              }}
            >
              <Ionicons name="person-remove-outline" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>Não Compareceu</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton]}
              onPress={() => {
                setSelectedAppointment(appointment);
                setShowCancelModal(true);
              }}
            >
              <Ionicons name="close-circle" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Ações para solicitação de reagendamento */}
        {appointment.status === 'reschedule_requested' && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.approveButton]}
              onPress={() => handleApproveReschedule(appointment)}
            >
              <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>Aprovar Reagendamento</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.rejectButton]}
              onPress={() => handleRejectReschedule(appointment.id)}
            >
              <Ionicons name="close-circle-outline" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>Rejeitar Reagendamento</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const handleApproveReschedule = async (appointment) => {
    try {
      if (!appointment.requested_date_change) {
        Alert.alert('Erro', 'Nenhuma nova data solicitada para aprovação.');
        return;
      }

      setLoading(true);
      // Aprovando o reagendamento: atualiza a data e o status para 'approved'
      const result = await AppointmentService.updateAppointmentStatus(
        appointment.id,
        'approved', // Novo status
        user.id,
        null, // Sem notas adicionais neste momento
        appointment.requested_date_change // Nova data da consulta
      );

      if (!result.success) {
        throw new Error(result.error);
      }

      await fetchAppointments();
      Alert.alert('Sucesso', 'Reagendamento aprovado e consulta atualizada!');
    } catch (error) {
      console.error('Error approving reschedule:', error);
      Alert.alert('Erro', error.message || 'Não foi possível aprovar o reagendamento.');
    } finally {
      setLoading(false);
    }
  };

  const handleRejectReschedule = async (appointmentId) => {
    try {
      setLoading(true);
      // Rejeitando o reagendamento: mantém a data original e volta para o status 'approved' ou 'pending'
      // Ou pode-se mudar para um novo status como 'reschedule_rejected' para registro
      const result = await AppointmentService.updateAppointmentStatus(
        appointmentId,
        'rejected', // Voltando para o status original ou um novo status de rejeição
        user.id
      );

      if (!result.success) {
        throw new Error(result.error);
      }

      await fetchAppointments();
      Alert.alert('Sucesso', 'Reagendamento rejeitado.');
    } catch (error) {
      console.error('Error rejecting reschedule:', error);
      Alert.alert('Erro', error.message || 'Não foi possível rejeitar o reagendamento.');
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
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Gerenciar Consultas</Text>
        <TouchableOpacity
          style={styles.calendarButton}
          onPress={() => setShowCalendar(true)}
        >
          <Ionicons name="calendar" size={24} color="#2196f3" />
        </TouchableOpacity>
      </View>

      <View style={styles.filterContainer}>
        {['pending', 'approved', 'rejected', 'completed', 'cancelled', 'no_show', 'reschedule_requested'].map((status) => (
          <TouchableOpacity
            key={status}
            style={[
              styles.filterButton,
              filter === status && styles.activeFilter,
            ]}
            onPress={() => setFilter(status)}
          >
            <Ionicons
              name={
                status === 'pending' ? 'time' :
                status === 'approved' ? 'checkmark-circle' :
                status === 'rejected' ? 'close-circle' :
                status === 'completed' ? 'checkmark-done-circle' :
                status === 'cancelled' ? 'ban' :
                status === 'no_show' ? 'person-remove-outline' :
                status === 'reschedule_requested' ? 'sync-circle-outline' :
                'ban'
              }
              size={20}
              color={filter === status ? '#fff' : '#666'}
            />
            <Text
              style={[
                styles.filterButtonText,
                filter === status && styles.activeFilterText,
              ]}
            >
              {status === 'pending' && 'Pendentes'}
              {status === 'approved' && 'Aprovadas'}
              {status === 'rejected' && 'Rejeitadas'}
              {status === 'completed' && 'Concluídas'}
              {status === 'cancelled' && 'Canceladas'}
              {status === 'no_show' && 'Não Compareceu'}
              {status === 'reschedule_requested' && 'Reagendamento Solicitado'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.appointmentsList}>
        {appointments.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={64} color="#ccc" />
            <Text style={styles.emptyStateText}>
              Nenhuma consulta {filter === 'pending' ? 'pendente' : 
                              filter === 'approved' ? 'aprovada' : 
                              filter === 'rejected' ? 'rejeitada' : 
                              filter === 'completed' ? 'concluída' : 
                              filter === 'cancelled' ? 'cancelada' :
                              filter === 'no_show' ? 'não compareceu' :
                              'reagendamento solicitado'} encontrada.
            </Text>
          </View>
        ) : (
          appointments.map(renderAppointmentCard)
        )}
      </ScrollView>

      {/* Calendar Modal */}
      <Modal
        visible={showCalendar}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Selecionar Data</Text>
              <TouchableOpacity
                onPress={() => setShowCalendar(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <Calendar
              current={selectedDate.toISOString().split('T')[0]}
              markedDates={markedDates}
              onDayPress={(day) => {
                setSelectedDate(new Date(day.timestamp));
                setShowCalendar(false);
              }}
              theme={{
                todayTextColor: '#2196f3',
                selectedDayBackgroundColor: '#2196f3',
                selectedDayTextColor: '#fff',
              }}
            />
          </View>
        </View>
      </Modal>

      {/* Cancel Appointment Modal */}
      <Modal
        visible={showCancelModal}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Cancelar Consulta</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowCancelModal(false);
                  setCancelReason('');
                  setSelectedAppointment(null);
                }}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.cancelInput}
              value={cancelReason}
              onChangeText={setCancelReason}
              placeholder="Motivo do cancelamento"
              multiline
              numberOfLines={4}
            />
            <TouchableOpacity
              style={styles.cancelConfirmButton}
              onPress={handleCancelAppointment}
            >
              <Text style={styles.cancelConfirmButtonText}>Confirmar Cancelamento</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {renderOutcomeModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  calendarButton: {
    padding: 10,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 10,
    flexWrap: 'wrap',
    gap: 10,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#fff',
    elevation: 2,
    marginRight: 10,
  },
  activeFilter: {
    backgroundColor: '#2196f3',
  },
  filterButtonText: {
    color: '#666',
    marginLeft: 5,
    fontSize: 12,
  },
  activeFilterText: {
    color: '#fff',
  },
  appointmentsList: {
    flex: 1,
    padding: 20,
  },
  appointmentCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  patientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  patientPhoto: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 10,
  },
  patientPhotoPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  patientInitials: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  patientName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  appointmentTime: {
    fontSize: 14,
    color: '#666',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  appointmentDetails: {
    marginBottom: 15,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    marginLeft: 10,
    color: '#666',
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 15,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 5,
  },
  actionButtonText: {
    color: '#fff',
    marginLeft: 5,
    fontWeight: 'bold',
  },
  approveButton: {
    backgroundColor: '#66bb6a',
  },
  rejectButton: {
    backgroundColor: '#ef5350',
  },
  completeButton: {
    backgroundColor: '#42a5f5',
  },
  cancelButton: {
    backgroundColor: '#bdbdbd',
  },
  noShowButton: {
    backgroundColor: '#ff5722',
    padding: 10,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginHorizontal: 5,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    color: '#666',
    marginTop: 10,
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: 5,
  },
  cancelInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    height: 100,
    textAlignVertical: 'top',
  },
  cancelConfirmButton: {
    backgroundColor: '#ef5350',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelConfirmButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  modalMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalTextInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  modalConfirmButton: {
    backgroundColor: '#2ecc71',
  },
  modalCancelButton: {
    backgroundColor: '#ccc',
  },
  modalNoShowButton: {
    backgroundColor: '#ff5722',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default DoctorAppointmentManagement; 