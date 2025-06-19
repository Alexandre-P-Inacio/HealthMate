import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { AppointmentService } from '../../services/AppointmentService';
import { Ionicons } from '@expo/vector-icons';
import supabase from '../../../supabase';

const AppointmentHistory = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'completed', 'cancelled'

  useEffect(() => {
    fetchAppointments();
  }, [filter]);

  const fetchAppointments = async () => {
    try {
      if (!user || !user.id) {
        console.warn('Cannot fetch appointments: user or user.id is null/undefined.');
        setLoading(false);
        return;
      }
      const parsedUserId = parseInt(user.id);
      if (isNaN(parsedUserId)) {
        console.warn(`AppointmentHistory: Invalid userId parsed: ${user.id}`);
        setLoading(false);
        return;
      }

      const result = await AppointmentService.getUserAppointments(
        parsedUserId,
        filter === 'all' ? null : filter
      );

      if (!result.success) {
        throw new Error(result.error);
      }

      // Sort appointments by date (most recent first)
      const sortedAppointments = result.data.sort((a, b) => 
        new Date(b.appointment_datetime) - new Date(a.appointment_datetime)
      );

      setAppointments(sortedAppointments);
    } catch (error) {
      console.error('Error fetching appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      completed: '#42a5f5',
      cancelled: '#bdbdbd',
      rejected: '#ef5350'
    };
    return colors[status] || '#bdbdbd';
  };

  const renderAppointmentCard = (appointment) => {
    const appointmentDate = new Date(appointment.appointment_datetime);
    const statusColor = getStatusColor(appointment.status);

    return (
      <View key={appointment.id} style={styles.appointmentCard}>
        <View style={styles.appointmentHeader}>
          <View style={styles.doctorInfo}>
            {appointment.doctors.photo_url ? (
              <Image
                source={{ uri: appointment.doctors.photo_url }}
                style={styles.doctorPhoto}
              />
            ) : (
              <View style={[styles.doctorPhotoPlaceholder, { backgroundColor: statusColor }]}>
                <Text style={styles.doctorInitials}>
                  {appointment.doctors.name.split(' ').map(n => n[0]).join('')}
                </Text>
              </View>
            )}
            <View>
              <Text style={styles.doctorName}>Dr. {appointment.doctors.name}</Text>
              <Text style={styles.doctorSpecialty}>{appointment.doctors.specialization}</Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>
              {appointment.status === 'completed' ? 'Concluída' :
               appointment.status === 'cancelled' ? 'Cancelada' : 'Rejeitada'}
            </Text>
          </View>
        </View>

        <View style={styles.appointmentDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={20} color="#666" />
            <Text style={styles.detailText}>
              {appointmentDate.toLocaleDateString()}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="time-outline" size={20} color="#666" />
            <Text style={styles.detailText}>
              {appointmentDate.toLocaleTimeString()}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={20} color="#666" />
            <Text style={styles.detailText}>{appointment.location}</Text>
          </View>

          {appointment.notes && (
            <View style={styles.detailRow}>
              <Ionicons name="document-text-outline" size={20} color="#666" />
              <Text style={styles.detailText}>{appointment.notes}</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196f3" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Histórico de Consultas</Text>

      <View style={styles.filterContainer}>
        {[
          { id: 'all', label: 'Todas', icon: 'list' },
          { id: 'completed', label: 'Concluídas', icon: 'checkmark-done-circle' },
          { id: 'cancelled', label: 'Canceladas', icon: 'close-circle' }
        ].map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[
              styles.filterButton,
              filter === item.id && styles.activeFilter,
            ]}
            onPress={() => setFilter(item.id)}
          >
            <Ionicons
              name={item.icon}
              size={20}
              color={filter === item.id ? '#fff' : '#666'}
            />
            <Text
              style={[
                styles.filterButtonText,
                filter === item.id && styles.activeFilterText,
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.appointmentsList}>
        {appointments.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={64} color="#ccc" />
            <Text style={styles.emptyStateText}>
              Nenhuma consulta {filter === 'completed' ? 'concluída' :
                              filter === 'cancelled' ? 'cancelada' :
                              ''} encontrada.
            </Text>
          </View>
        ) : (
          appointments.map(renderAppointmentCard)
        )}
      </ScrollView>
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    padding: 20,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 10,
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
  doctorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  doctorPhoto: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 10,
  },
  doctorPhotoPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  doctorInitials: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  doctorName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  doctorSpecialty: {
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
    marginTop: 10,
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
});

export default AppointmentHistory; 