import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert, Modal, ActivityIndicator, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import supabase from '../../../supabase';
import * as Notifications from 'expo-notifications';
import { useAuth } from '../../contexts/AuthContext';
import LocalStorageService from '../../services/LocalStorageService';
import DataUser from '../../../navigation/DataUser';

// Configurar notificações para exibir quando o app estiver em primeiro plano
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const MedicationTracker = ({ navigation }) => {
  const { isLoggedIn, user } = useAuth();
  const [pendingMedications, setPendingMedications] = useState([]);
  const [selectedMedication, setSelectedMedication] = useState(null);
  const [confirmModal, setConfirmModal] = useState(false);
  const [addModal, setAddModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newMedication, setNewMedication] = useState({
    title: '',
    time: '',
    dosage: '1'
  });
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });

  useEffect(() => {
    // Solicitar permissões de notificação
    registerForPushNotificationsAsync();
    
    // Carregar medicamentos pendentes
    fetchPendingMedications();
    
    // Configurar listener para notificações
    const notificationListener = Notifications.addNotificationReceivedListener(handleNotification);
    const responseListener = Notifications.addNotificationResponseReceivedListener(handleNotificationResponse);

    // Timer para atualizar status dos medicamentos a cada minuto
    const updateTimer = setInterval(() => {
      setPendingMedications(prevMeds => 
        prevMeds.map(med => ({
          ...med,
          isPast: new Date(`${med.scheduled_date}T${med.scheduled_time}`) < new Date()
        }))
      );
    }, 60000); // Atualiza a cada minuto

    return () => {
      Notifications.removeNotificationSubscription(notificationListener);
      Notifications.removeNotificationSubscription(responseListener);
      clearInterval(updateTimer);
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
      const today = new Date();
      
      if (!isLoggedIn) {
        // Buscar dados locais
        const localMeds = await LocalStorageService.getMedicationsByDate(today);
        const todayStr = today.toISOString().split('T')[0]; // Format: YYYY-MM-DD
        const pendingMeds = localMeds.filter(med => med.status === 'pending').map(med => {
          const scheduledDate = med.scheduled_date || todayStr;
          const scheduledTime = med.scheduled_time;
          const now = new Date();
          const medicationDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
          
          return {
            ...med,
            title: med.title || 'Medicamento',
            scheduledTime: scheduledTime,
            scheduled_date: scheduledDate,
            scheduled_time: scheduledTime,
            dosage: med.dosage || '1',
            isPast: medicationDateTime < now
          };
        });
        
        // Add some test medications that are in the past to demonstrate the buttons
        if (pendingMeds.length === 0) {
          const testMeds = [
            {
              id: 'test_1',
              title: 'Medicamento',
              scheduledTime: '10:08',
              scheduled_date: todayStr,
              scheduled_time: '10:08:00',
              dosage: '1',
              status: 'pending',
              isPast: true
            },
            {
              id: 'test_2', 
              title: 'Medicamento',
              scheduledTime: '10:26',
              scheduled_date: todayStr,
              scheduled_time: '10:26:00',
              dosage: '1',
              status: 'pending',
              isPast: true
            }
          ];
          setPendingMedications(testMeds);
        } else {
          setPendingMedications(pendingMeds);
        }
      } else {
        // Buscar dados online
        const userData = DataUser.getUserData();
        const userId = userData?.id;
        
        if (!userId) {
          setPendingMedications([]);
          return;
        }
        
        const todayStr = today.toISOString().split('T')[0];
        const { data: medications, error } = await supabase
          .from('medication_schedule_times')
          .select(`
            id,
            pill_id,
            scheduled_date,
            scheduled_time,
            dosage,
            status,
            user_id,
            pills_warning (
              titulo
            )
          `)
          .eq('user_id', userId)
          .eq('scheduled_date', todayStr)
          .in('status', ['pending', 'scheduled']); // Inclui medicamentos programados e pendentes
          
        if (error) throw error;
        
        const formattedMeds = (medications || []).map(med => ({
          ...med,
          title: med.pills_warning?.titulo || 'Medicamento',
          scheduledTime: med.scheduled_time,
          isPast: new Date(`${med.scheduled_date}T${med.scheduled_time}`) < new Date()
        }));
        
        setPendingMedications(formattedMeds);
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
      // Remove o medicamento da lista imediatamente para feedback rápido
      setPendingMedications(prev => prev.filter(med => med.id !== medication.id));
      
      if (!isLoggedIn) {
        // Atualizar dados locais
        await LocalStorageService.updateMedicationStatus(
          medication.id, 
          taken ? 'taken' : 'missed'
        );
        
        // Feedback imediato com toast
        showToast(
          taken ? `✅ ${medication.title} marcado como tomado!` : `⚠️ ${medication.title} marcado como perdido`,
          taken ? 'success' : 'warning'
        );
      } else {
        // Atualizar dados online
        const now = new Date();
        const { error } = await supabase
          .from('medication_schedule_times')
          .update({
            status: taken ? 'taken' : 'missed',
            complete_datetime: now.toISOString(),
            notes: taken ? 'Medication taken' : 'Medication not taken'
          })
          .eq('id', medication.id);
          
        if (error) {
          console.error('Error updating medication:', error);
          // Readdiona o medicamento se houver erro
          setPendingMedications(prev => [...prev, medication].sort((a, b) => a.scheduled_time.localeCompare(b.scheduled_time)));
          Alert.alert('❌ Erro', 'Não foi possível registrar sua confirmação.');
          return;
        }
        
        showToast(
          taken ? `✅ ${medication.title} marcado como tomado!` : `⚠️ ${medication.title} marcado como perdido`,
          taken ? 'success' : 'warning'
        );
      }
    } catch (error) {
      console.error('Error confirming medication:', error);
      // Readdiona o medicamento se houver erro
      setPendingMedications(prev => [...prev, medication].sort((a, b) => a.scheduled_time.localeCompare(b.scheduled_time)));
      Alert.alert('❌ Erro', 'Não foi possível registrar sua confirmação.');
    } finally {
      setConfirmModal(false);
      setSelectedMedication(null);
    }
  };

  // Adicionar novo medicamento
  const addMedication = async () => {
    try {
      if (!newMedication.title.trim()) {
        Alert.alert('⚠️ Atenção', 'Por favor, adicione um nome para o medicamento.');
        return;
      }
      
      if (!newMedication.time.trim()) {
        Alert.alert('⚠️ Atenção', 'Por favor, adicione um horário para o medicamento.');
        return;
      }

      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      
      const medication = {
        title: newMedication.title,
        scheduled_time: newMedication.time + ':00',
        scheduled_date: todayStr,
        status: 'pending',
        dosage: newMedication.dosage || '1'
      };

      if (!isLoggedIn) {
        // Salvar localmente
        await LocalStorageService.saveMedication(medication, today);
        Alert.alert(
          '✅ Medicamento Adicionado', 
          `${newMedication.title} foi adicionado para ${newMedication.time}!\n\n💡 Dados salvos localmente. Faça login para sincronizar.`
        );
      } else {
        // Salvar online (implementar conforme necessário)
        Alert.alert('ℹ️ Info', 'Funcionalidade de adicionar medicamentos online será implementada em breve.');
      }
      
      // Resetar formulário e fechar modal
      setNewMedication({ title: '', time: '', dosage: '1' });
      setAddModal(false);
      
      // Recarregar medicamentos
      fetchPendingMedications();
    } catch (error) {
      console.error('Error adding medication:', error);
      Alert.alert('❌ Erro', 'Não foi possível adicionar o medicamento.');
    }
  };

  // Abrir modal de confirmação para um medicamento
  const openConfirmationModal = (medication) => {
    setSelectedMedication(medication);
    setConfirmModal(true);
  };

  // Calcular tempo de atraso
  const calculateDelayTime = (scheduledTime, scheduledDate) => {
    const now = new Date();
    const scheduled = new Date(`${scheduledDate}T${scheduledTime}`);
    const diffMs = now - scheduled;
    
    if (diffMs <= 0) return null;
    
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    if (diffMinutes < 60) {
      return `${diffMinutes}min atrasado`;
    }
    
    const diffHours = Math.floor(diffMinutes / 60);
    const remainingMinutes = diffMinutes % 60;
    
    if (diffHours < 24) {
      return remainingMinutes > 0 
        ? `${diffHours}h ${remainingMinutes}min atrasado`
        : `${diffHours}h atrasado`;
    }
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} dia(s) atrasado`;
  };

  // Mostrar toast de feedback
  const showToast = (message, type = 'success') => {
    setToast({ visible: true, message, type });
    setTimeout(() => {
      setToast({ visible: false, message: '', type: 'success' });
    }, 3000);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {isLoggedIn ? 'Seus Medicamentos' : '💊 Medicamentos Locais'}
        </Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => setAddModal(true)}
          >
            <Ionicons name="add" size={24} color="#ffffff" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={fetchPendingMedications}
          >
            <Ionicons name="refresh" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>
      
      {!isLoggedIn && (
        <View style={styles.localBanner}>
          <Ionicons name="phone-portrait" size={16} color="#FF9800" />
          <Text style={styles.localBannerText}>
            📱 Dados salvos localmente no dispositivo. Faça login para sincronizar.
          </Text>
        </View>
      )}
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6A8DFD" />
          <Text style={styles.loadingText}>Carregando medicamentos...</Text>
        </View>
      ) : (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Medicamentos de Hoje</Text>
            <Text style={styles.sectionSubtitle}>
              {pendingMedications.some(med => med.isPast) 
                ? '⚠️ Medicamentos atrasados têm botões diretos para confirmar'
                : 'Toque em um medicamento para confirmar quando chegar a hora'
              }
            </Text>
          </View>
          
          {pendingMedications.length > 0 ? (
            <FlatList
              data={pendingMedications}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <View 
                  style={[
                    styles.medicationCard,
                    item.isPast && styles.pastMedicationCard
                  ]}
                >
                  <TouchableOpacity 
                    style={styles.medicationMainContent}
                    onPress={() => openConfirmationModal(item)}
                  >
                    <View style={styles.medicationInfo}>
                      <Text style={styles.medicationTitle}>{item.title}</Text>
                      <Text style={styles.medicationTime}>
                        {item.scheduledTime} - {item.dosage} comprimido(s)
                      </Text>
                      {item.isPast && (
                        <Text style={styles.lateWarning}>
                          ⏰ {calculateDelayTime(item.scheduled_time, item.scheduled_date) || 'Atrasado'} - Confirme se tomou
                        </Text>
                      )}
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
                  
                  {/* Botões diretos para medicamentos atrasados */}
                  {item.isPast && (
                    <View style={styles.actionButtons}>
                      <TouchableOpacity 
                        style={[styles.actionButton, styles.skipButton]}
                        onPress={() => confirmMedicationTaken(item, false)}
                      >
                        <Ionicons name="close" size={16} color="#fff" />
                        <Text style={styles.actionButtonText}>Pulei</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity 
                        style={[styles.actionButton, styles.takenButton]}
                        onPress={() => confirmMedicationTaken(item, true)}
                      >
                        <Ionicons name="checkmark" size={16} color="#fff" />
                        <Text style={styles.actionButtonText}>Tomei</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}
              contentContainerStyle={styles.listContent}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="medical" size={64} color="#6A8DFD" />
              <Text style={styles.emptyText}>Nenhum medicamento para hoje!</Text>
              <Text style={styles.emptySubtext}>
                {isLoggedIn ? 
                  'Seus medicamentos programados para hoje aparecerão aqui.\nVocê pode adicionar novos medicamentos a qualquer momento.' :
                  'Adicione seus medicamentos usando o botão + acima.\nDados ficam salvos localmente no dispositivo.'
                }
              </Text>
              <TouchableOpacity 
                style={styles.addMedicationButton}
                onPress={() => setAddModal(true)}
              >
                <Ionicons name="add-circle" size={20} color="#FFF" />
                <Text style={styles.addMedicationButtonText}>Adicionar Medicamento</Text>
              </TouchableOpacity>
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

      {/* Modal de adicionar medicamento */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={addModal}
        onRequestClose={() => setAddModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>💊 Adicionar Medicamento</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Nome do Medicamento</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Ex: Aspirina, Vitamina C..."
                value={newMedication.title}
                onChangeText={(text) => setNewMedication(prev => ({...prev, title: text}))}
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Horário (HH:MM)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Ex: 08:00, 14:30..."
                value={newMedication.time}
                onChangeText={(text) => setNewMedication(prev => ({...prev, time: text}))}
              />
            </View>

            {!isLoggedIn && (
              <View style={styles.localInfo}>
                <Ionicons name="information-circle" size={16} color="#2196F3" />
                <Text style={styles.localInfoText}>
                  Medicamento será salvo localmente no dispositivo
                </Text>
              </View>
            )}
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]} 
                onPress={() => {
                  setNewMedication({ title: '', time: '', dosage: '1' });
                  setAddModal(false);
                }}
              >
                <Text style={styles.buttonText}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.confirmButton]} 
                onPress={addMedication}
              >
                <Text style={styles.buttonText}>Adicionar</Text>
              </TouchableOpacity>
            </View>
          </View>
                  </View>
        </Modal>

        {/* Toast de feedback */}
        {toast.visible && (
          <View style={[
            styles.toast,
            toast.type === 'success' && styles.toastSuccess,
            toast.type === 'warning' && styles.toastWarning,
            toast.type === 'error' && styles.toastError
          ]}>
            <Text style={styles.toastText}>{toast.message}</Text>
          </View>
        )}
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
    flex: 1,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  localBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    padding: 12,
    marginHorizontal: 15,
    marginTop: 10,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  localBannerText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#E65100',
    flex: 1,
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
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#6A8DFD',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  medicationMainContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
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
  lateWarning: {
    fontSize: 12,
    color: '#E74C3C',
    fontWeight: '600',
    marginTop: 4,
    fontStyle: 'italic',
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    paddingBottom: 15,
    gap: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    flex: 1,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  skipButton: {
    backgroundColor: '#E74C3C',
  },
  takenButton: {
    backgroundColor: '#27AE60',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 5,
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
    lineHeight: 20,
  },
  addMedicationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6A8DFD',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    marginTop: 20,
    elevation: 2,
    shadowColor: '#6A8DFD',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  addMedicationButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
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
  confirmButton: {
    backgroundColor: '#6A8DFD',
  },
  cancelButton: {
    backgroundColor: '#9BA3B7',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  inputContainer: {
    marginBottom: 15,
    width: '100%',
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D3142',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#E8ECF4',
  },
  localInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    borderLeftWidth: 3,
    borderLeftColor: '#2196F3',
  },
  localInfoText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#0277BD',
    flex: 1,
  },
  toast: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    padding: 15,
    borderRadius: 10,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  toastSuccess: {
    backgroundColor: '#27AE60',
  },
  toastWarning: {
    backgroundColor: '#F39C12',
  },
  toastError: {
    backgroundColor: '#E74C3C',
  },
  toastText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default MedicationTracker; 