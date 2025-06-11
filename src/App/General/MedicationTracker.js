import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert, Modal, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import supabase from '../../../supabase';
import * as Notifications from 'expo-notifications';

// Configurar notificações para exibir quando o app estiver em primeiro plano
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const MedicationTracker = ({ navigation }) => {
  const [pendingMedications, setPendingMedications] = useState([]);
  const [selectedMedication, setSelectedMedication] = useState(null);
  const [confirmModal, setConfirmModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Solicitar permissões de notificação
    registerForPushNotificationsAsync();
    
    // Carregar medicamentos pendentes
    fetchPendingMedications();
    
    // Configurar listener para notificações
    const notificationListener = Notifications.addNotificationReceivedListener(handleNotification);
    const responseListener = Notifications.addNotificationResponseReceivedListener(handleNotificationResponse);

    return () => {
      Notifications.removeNotificationSubscription(notificationListener);
      Notifications.removeNotificationSubscription(responseListener);
    };
  }, []);

  // Obter permissões de notificação
  const registerForPushNotificationsAsync = async () => {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      Alert.alert('Permission required', 'Allow notifications to receive reminders.');
      return;
    }
  };

  // Carregar medicamentos pendentes para hoje
  const fetchPendingMedications = async () => {
    try {
      setLoading(true);
      // Obter a data de hoje
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      // Buscar medicamentos agendados pendentes
      const { data: medications, error } = await supabase
        .from('medication_schedule_times')
        .select('*')
        .eq('user_id', userId)
        .eq('scheduled_date', todayStr)
        .eq('status', 'pending');
      if (error) throw error;
      setPendingMedications(medications || []);
    } catch (error) {
      console.error('Erro ao buscar medicamentos:', error);
      Alert.alert('Erro', 'Não foi possível carregar seus medicamentos.');
    } finally {
      setLoading(false);
    }
  };

  // Programar notificações para medicamentos
  const scheduleMedicationNotifications = async (medications) => {
    await Notifications.cancelAllScheduledNotificationsAsync();
    
    for (const med of medications) {
      const triggerTime = new Date(med.scheduledDateTime).getTime();
      
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Medication Reminder',
          body: `It's time to take your medication: ${med.title}`,
          data: { medicationId: med.medicationId },
        },
        trigger: {
          type: 'date',
          timestamp: triggerTime,
        },
      });
    }
  };

  // Lidar com notificação quando recebida
  const handleNotification = (notification) => {
    const { medicationId, scheduledTime } = notification.request.content.data;
    
    // Encontrar o medicamento correspondente
    const medication = pendingMedications.find(
      med => med.medicationId === medicationId && med.scheduledTime === scheduledTime
    );
    
    if (medication) {
      setSelectedMedication(medication);
      setConfirmModal(true);
    }
  };

  // Lidar com resposta à notificação
  const handleNotificationResponse = (response) => {
    const { medicationId, scheduledTime } = response.notification.request.content.data;
    
    // Encontrar o medicamento correspondente
    const medication = pendingMedications.find(
      med => med.medicationId === medicationId && med.scheduledTime === scheduledTime
    );
    
    if (medication) {
      setSelectedMedication(medication);
      setConfirmModal(true);
    }
  };

  // Confirmar que tomou o medicamento
  const confirmMedicationTaken = async (medication, taken) => {
    try {
      // Update the status in medication_schedule_times
      const now = new Date();
      const { error } = await supabase.from('medication_schedule_times').update({
        status: taken ? 'taken' : 'missed',
        complete_datetime: now.toISOString(),
        notes: taken ? 'Medication taken' : 'Medication not taken'
      }).eq('id', medication.id);
      if (error) throw error;
      setPendingMedications(prev => prev.filter(med => med.id !== medication.id));
      Alert.alert('Confirmed', taken ? 'Medication marked as taken!' : 'Medication marked as not taken.');
    } catch (error) {
      console.error('Error confirming medication:', error);
      Alert.alert('Error', 'Could not record your confirmation.');
    } finally {
      setConfirmModal(false);
      setSelectedMedication(null);
    }
  };

  // Abrir modal de confirmação para um medicamento
  const openConfirmationModal = (medication) => {
    setSelectedMedication(medication);
    setConfirmModal(true);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Seus Medicamentos</Text>
        <TouchableOpacity 
          style={styles.refreshButton}
          onPress={fetchPendingMedications}
        >
          <Ionicons name="refresh" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6A8DFD" />
          <Text style={styles.loadingText}>Carregando medicamentos...</Text>
        </View>
      ) : (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Pendentes para Hoje</Text>
            <Text style={styles.sectionSubtitle}>
              Toque em um medicamento para confirmar
            </Text>
          </View>
          
          {pendingMedications.length > 0 ? (
            <FlatList
              data={pendingMedications}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={[
                    styles.medicationCard,
                    item.isPast && styles.pastMedicationCard
                  ]}
                  onPress={() => openConfirmationModal(item)}
                >
                  <View style={styles.medicationInfo}>
                    <Text style={styles.medicationTitle}>{item.title}</Text>
                    <Text style={styles.medicationTime}>
                      {item.scheduledTime} - {item.dosage} comprimido(s)
                    </Text>
                  </View>
                  <View style={styles.medicationStatus}>
                    {item.isPast ? (
                      <View style={styles.statusBadge}>
                        <Text style={styles.statusText}>Atrasado</Text>
                      </View>
                    ) : (
                      <View style={[styles.statusBadge, styles.upcomingBadge]}>
                        <Text style={[styles.statusText, styles.upcomingText]}>Programado</Text>
                      </View>
                    )}
                    <Ionicons 
                      name="checkmark-circle-outline" 
                      size={24} 
                      color="#6A8DFD" 
                    />
                  </View>
                </TouchableOpacity>
              )}
              contentContainerStyle={styles.listContent}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="checkmark-circle" size={64} color="#6A8DFD" />
              <Text style={styles.emptyText}>Nenhum medicamento pendente!</Text>
              <Text style={styles.emptySubtext}>
                Seus medicamentos aparecerão aqui quando estiverem programados.
              </Text>
            </View>
          )}
        </>
      )}
      
      {/* Modal de confirmação */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={confirmModal}
        onRequestClose={() => setConfirmModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Confirmação de Medicamento</Text>
            
            {selectedMedication && (
              <>
                <Text style={styles.medicationModalTitle}>{selectedMedication.title}</Text>
                <Text style={styles.medicationModalTime}>
                  Horário: {selectedMedication.scheduledTime}
                </Text>
                <Text style={styles.medicationModalDosage}>
                  Dose: {selectedMedication.dosage} comprimido(s)
                </Text>
                
                <Text style={styles.modalQuestion}>
                  Você tomou este medicamento?
                </Text>
                
                <View style={styles.modalButtons}>
                  <TouchableOpacity 
                    style={[styles.modalButton, styles.noButton]} 
                    onPress={() => confirmMedicationTaken(selectedMedication, false)}
                  >
                    <Text style={styles.buttonText}>Não</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.modalButton, styles.yesButton]} 
                    onPress={() => confirmMedicationTaken(selectedMedication, true)}
                  >
                    <Text style={styles.buttonText}>Sim</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F6FA',
  },
  header: {
    backgroundColor: '#6A8DFD',
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionHeader: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E8ECF4',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3142',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#9BA3B7',
    marginTop: 4,
  },
  listContent: {
    padding: 15,
  },
  medicationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderLeftWidth: 3,
    borderLeftColor: '#6A8DFD',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  pastMedicationCard: {
    borderLeftColor: '#E74C3C',
  },
  medicationInfo: {
    flex: 1,
  },
  medicationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D3142',
    marginBottom: 5,
  },
  medicationTime: {
    fontSize: 14,
    color: '#9BA3B7',
  },
  medicationStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadge: {
    backgroundColor: '#FFEBE5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    marginRight: 10,
  },
  upcomingBadge: {
    backgroundColor: '#E8F0FF',
  },
  statusText: {
    fontSize: 12,
    color: '#E74C3C',
    fontWeight: 'bold',
  },
  upcomingText: {
    color: '#6A8DFD',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#9BA3B7',
    marginTop: 10,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9BA3B7',
    marginTop: 8,
    textAlign: 'center',
    maxWidth: '80%',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#9BA3B7',
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D3142',
    marginBottom: 15,
  },
  medicationModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6A8DFD',
    marginBottom: 10,
  },
  medicationModalTime: {
    fontSize: 16,
    color: '#2D3142',
    marginBottom: 5,
  },
  medicationModalDosage: {
    fontSize: 16,
    color: '#2D3142',
    marginBottom: 20,
  },
  modalQuestion: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D3142',
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
});

export default MedicationTracker; 