import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import supabase from '../../supabase';
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
      Alert.alert('Permissão necessária', 'Sem permissão para enviar notificações!');
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
      
      // Buscar medicamentos no banco de dados
      const { data: medications, error } = await supabase
        .from('pills_warning')
        .select('*');
        
      if (error) throw error;
      
      if (medications) {
        // Buscar eventos de confirmação já registrados hoje
        const { data: confirmations, error: confirmError } = await supabase
          .from('medication_confirmations')
          .select('*')
          .eq('confirmation_date', todayStr);
          
        if (confirmError) throw confirmError;
        
        // Filtrar medicamentos para hoje que ainda não foram confirmados
        const pending = [];
        
        for (const med of medications) {
          // Verificar se é um medicamento ativo
          if (med.status !== 'active' && med.status !== 'calendar_added') continue;
          
          // Obter horários programados para hoje
          const scheduledTimes = [];
          
          if (med.horario_fixo && med.horario_fixo !== 'NULL') {
            // Para horários fixos
            scheduledTimes.push(...med.horario_fixo.split(';').map(time => time.trim()));
          } else if (med.data_inicio && med.intervalo_horas) {
            // Para intervalos de horas
            let startTime;
            if (med.data_inicio.includes(';')) {
              const [dateStr, timeStr] = med.data_inicio.split(';');
              startTime = new Date(`${todayStr}T${timeStr.trim()}`);
            } else {
              startTime = new Date(`${todayStr}T00:00:00`);
            }
            
            // Adicionar intervalos ao longo do dia
            const intervalHours = parseInt(med.intervalo_horas);
            if (!isNaN(intervalHours) && intervalHours > 0) {
              let currentTime = new Date(startTime);
              while (currentTime.getDate() === today.getDate()) {
                scheduledTimes.push(
                  currentTime.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})
                );
                currentTime = new Date(currentTime.getTime() + intervalHours * 60 * 60 * 1000);
              }
            }
          }
          
          // Para cada horário programado, verificar se já foi confirmado
          for (const time of scheduledTimes) {
            // Criar um objeto de data/hora para este horário
            const [hours, minutes] = time.split(':').map(num => parseInt(num, 10));
            const scheduledDateTime = new Date(today);
            scheduledDateTime.setHours(hours, minutes, 0, 0);
            
            // Verificar se já passou do horário
            const isPast = scheduledDateTime <= new Date();
            
            // Verificar se já foi confirmado
            const isConfirmed = confirmations?.some(conf => 
              conf.medication_id === med.id && 
              conf.scheduled_time === time
            );
            
            if (!isConfirmed) {
              pending.push({
                id: `${med.id}-${time}`,
                medicationId: med.id,
                title: med.titulo,
                scheduledTime: time,
                scheduledDateTime,
                isPast,
                dosage: med.quantidade_comprimidos_por_vez,
              });
            }
          }
        }
        
        // Ordenar por horário
        pending.sort((a, b) => a.scheduledDateTime - b.scheduledDateTime);
        setPendingMedications(pending);
        
        // Programar notificações para os próximos medicamentos
        scheduleMedicationNotifications(pending);
      }
    } catch (error) {
      console.error('Erro ao buscar medicamentos:', error);
      Alert.alert('Erro', 'Não foi possível carregar seus medicamentos.');
    } finally {
      setLoading(false);
    }
  };

  // Programar notificações para medicamentos
  const scheduleMedicationNotifications = async (medications) => {
    // Cancelar notificações existentes
    await Notifications.cancelAllScheduledNotificationsAsync();
    
    // Adicionar novas notificações para medicamentos pendentes futuros
    for (const med of medications) {
      if (!med.isPast) {
        const trigger = new Date(med.scheduledDateTime);
        trigger.setSeconds(0); // Remover segundos
        
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Hora do Medicamento',
            body: `${med.title} - ${med.scheduledTime}`,
            data: { medicationId: med.medicationId, scheduledTime: med.scheduledTime },
          },
          trigger,
        });
      }
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
      // Obter a data de hoje
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      
      // Registrar no banco de dados
      const { error } = await supabase.from('medication_confirmations').insert({
        medication_id: medication.medicationId,
        scheduled_time: medication.scheduledTime,
        confirmation_date: todayStr,
        confirmation_time: new Date().toISOString(),
        taken: taken,
        notes: taken ? 'Medicamento tomado' : 'Medicamento não tomado'
      });
      
      if (error) throw error;
      
      // Atualizar a lista de medicamentos pendentes
      setPendingMedications(prev => 
        prev.filter(med => med.id !== medication.id)
      );
      
      // Mostrar mensagem de sucesso
      Alert.alert(
        'Confirmado',
        taken ? 'Medicamento marcado como tomado!' : 'Medicamento marcado como não tomado.'
      );
      
    } catch (error) {
      console.error('Erro ao confirmar medicamento:', error);
      Alert.alert('Erro', 'Não foi possível registrar sua confirmação.');
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
          <Text style={styles.loadingText}>Carregando medicamentos...</Text>
        </View>
      ) : (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Pendentes para Hoje</Text>
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
                      name="chevron-forward" 
                      size={20} 
                      color="#9BA3B7" 
                    />
                  </View>
                </TouchableOpacity>
              )}
              contentContainerStyle={styles.listContent}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="checkmark-circle" size={50} color="#6A8DFD" />
              <Text style={styles.emptyText}>Nenhum medicamento pendente!</Text>
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