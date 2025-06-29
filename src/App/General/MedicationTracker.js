import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert, Modal, ActivityIndicator, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import supabase from '../../../supabase';
import * as Notifications from 'expo-notifications';
import { useAuth } from '../../contexts/AuthContext';
import LocalStorageService from '../../services/LocalStorageService';
import DataUser from '../../../navigation/DataUser';
import NotificationService from '../../services/NotificationService';

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
    initializeNotifications();
    
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

  // Inicializar sistema de notificações
  const initializeNotifications = async () => {
    try {
      // Configurar categorias de notificação
      await NotificationService.setupNotificationCategories();
      
      // Solicitar permissões
      const hasPermission = await NotificationService.registerForPushNotifications();
      
      if (hasPermission && isLoggedIn) {
        // Agendar todas as notificações de medicamentos
        await NotificationService.scheduleAllMedicationNotifications();
        console.log('🔔 Notification system initialized');
      }
          } catch (error) {
        console.error('❌ Error initializing notifications:', error);
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
            title: med.title || 'Medication',
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
              title: 'Medication',
              scheduledTime: '10:08',
              scheduled_date: todayStr,
              scheduled_time: '10:08:00',
              dosage: '1',
              status: 'pending',
              isPast: true
            },
            {
              id: 'test_2', 
              title: 'Medication',
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
          .in('status', ['pending', 'scheduled']); // Include scheduled and pending medications
          
        if (error) throw error;
        
        const formattedMeds = (medications || []).map(med => ({
          ...med,
          title: med.pills_warning?.titulo || 'Medication',
          scheduledTime: med.scheduled_time,
          isPast: new Date(`${med.scheduled_date}T${med.scheduled_time}`) < new Date()
        }));
        
        setPendingMedications(formattedMeds);
      }
    } catch (error) {
      console.error('Error fetching medications:', error);
      Alert.alert('Error', 'Unable to load your medications.');
    } finally {
      setLoading(false);
    }
  };

  // Reagendar notificações após mudanças
  const refreshNotifications = async () => {
    if (isLoggedIn) {
      try {
        await NotificationService.scheduleAllMedicationNotifications();
        console.log('🔄 Medication notifications updated');
              } catch (error) {
          console.error('❌ Error updating notifications:', error);
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
      // Remove o medicamento da lista imediatamente para feedback rápido
      setPendingMedications(prev => prev.filter(med => med.id !== medication.id));
      
      // Cancelar notificações deste medicamento específico
      if (isLoggedIn) {
        await NotificationService.cancelMedicationNotification(medication.id);
      }
      
      if (!isLoggedIn) {
        // Atualizar dados locais
        await LocalStorageService.updateMedicationStatus(
          medication.id, 
          taken ? 'taken' : 'missed'
        );
        
        // Feedback imediato com toast
        showToast(
          taken ? `✅ ${medication.title} marked as taken!` : `⚠️ ${medication.title} marked as missed`,
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
          // Re-add medication if there's an error
          setPendingMedications(prev => [...prev, medication].sort((a, b) => a.scheduled_time.localeCompare(b.scheduled_time)));
          Alert.alert('❌ Error', 'Unable to record your confirmation.');
          return;
        }
        
        showToast(
          taken ? `✅ ${medication.title} marked as taken!` : `⚠️ ${medication.title} marked as missed`,
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
        Alert.alert('⚠️ Warning', 'Please add a name for the medication.');
        return;
      }
      
      if (!newMedication.time.trim()) {
        Alert.alert('⚠️ Warning', 'Please add a time for the medication.');
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
          '✅ Medication Added', 
          `${newMedication.title} was added for ${newMedication.time}!\n\n💡 Data saved locally. Login to sync.`
        );
      } else {
        // Save online (implement as needed)
        Alert.alert('ℹ️ Info', 'Online medication adding functionality will be implemented soon.');
      }
      
      // Resetar formulário e fechar modal
      setNewMedication({ title: '', time: '', dosage: '1' });
      setAddModal(false);
      
      // Recarregar medicamentos
      fetchPendingMedications();
      
      // Reagendar notificações
      await refreshNotifications();
    } catch (error) {
      console.error('Error adding medication:', error);
      Alert.alert('❌ Error', 'Unable to add the medication.');
    }
  };

  // Abrir modal de confirmação para um medicamento
  const openConfirmationModal = (medication) => {
    setSelectedMedication(medication);
    setConfirmModal(true);
  };

  // Calculate delay time
  const calculateDelayTime = (scheduledTime, scheduledDate) => {
    const now = new Date();
    const scheduled = new Date(`${scheduledDate}T${scheduledTime}`);
    const diffMs = now - scheduled;
    
    if (diffMs <= 0) return null;
    
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    if (diffMinutes < 60) {
      return `${diffMinutes}min late`;
    }
    
    const diffHours = Math.floor(diffMinutes / 60);
    const remainingMinutes = diffMinutes % 60;
    
    if (diffHours < 24) {
      return remainingMinutes > 0 
        ? `${diffHours}h ${remainingMinutes}min late`
        : `${diffHours}h late`;
    }
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day(s) late`;
  };

  // Show feedback toast
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
          {isLoggedIn ? 'Your Medications' : '💊 Local Medications'}
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
            📱 Data saved locally on device. Login to sync.
          </Text>
        </View>
      )}
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6A8DFD" />
          <Text style={styles.loadingText}>Loading medications...</Text>
        </View>
      ) : (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Today's Medications</Text>
            <Text style={styles.sectionSubtitle}>
              {pendingMedications.some(med => med.isPast) 
                ? '⚠️ Late medications have direct buttons to confirm'
                : 'Tap a medication to confirm when it\'s time'
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
                        {item.scheduledTime} - {item.dosage} pill(s)
                      </Text>
                      {item.isPast && (
                        <Text style={styles.lateWarning}>
                          ⏰ {calculateDelayTime(item.scheduled_time, item.scheduled_date) || 'Late'} - Confirm if taken
                        </Text>
                      )}
                    </View>
                    <View style={styles.medicationStatus}>
                      {item.isPast ? (
                        <View style={styles.statusBadge}>
                          <Text style={styles.statusText}>Late</Text>
                        </View>
                      ) : (
                        <View style={[styles.statusBadge, styles.upcomingBadge]}>
                          <Text style={[styles.statusText, styles.upcomingText]}>Scheduled</Text>
                        </View>
                      )}
                      <Ionicons 
                        name="checkmark-circle-outline" 
                        size={24} 
                        color="#6A8DFD" 
                      />
                    </View>
                  </TouchableOpacity>
                  
                  {/* Direct buttons for late medications */}
                  {item.isPast && (
                    <View style={styles.actionButtons}>
                      <TouchableOpacity 
                        style={[styles.actionButton, styles.skipButton]}
                        onPress={() => confirmMedicationTaken(item, false)}
                      >
                        <Ionicons name="close" size={16} color="#fff" />
                        <Text style={styles.actionButtonText}>Skipped</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity 
                        style={[styles.actionButton, styles.takenButton]}
                        onPress={() => confirmMedicationTaken(item, true)}
                      >
                        <Ionicons name="checkmark" size={16} color="#fff" />
                        <Text style={styles.actionButtonText}>Taken</Text>
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
              <Text style={styles.emptyText}>No medications for today!</Text>
              <Text style={styles.emptySubtext}>
                {isLoggedIn ? 
                  'Your scheduled medications for today will appear here.\nYou can add new medications anytime.' :
                  'Add your medications using the + button above.\nData stays saved locally on device.'
                }
              </Text>
              <TouchableOpacity 
                style={styles.addMedicationButton}
                onPress={() => setAddModal(true)}
              >
                <Ionicons name="add-circle" size={20} color="#fff" />
                <Text style={styles.addMedicationButtonText}>Add Medication</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}
      
      {/* Confirmation Modal */}
      {selectedMedication && (
        <Modal
          visible={confirmModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setConfirmModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Confirm Medication</Text>
                <TouchableOpacity onPress={() => setConfirmModal(false)}>
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.modalContent}>
                <Text style={styles.medicationName}>{selectedMedication.title}</Text>
                <Text style={styles.medicationDetails}>
                  Scheduled for: {selectedMedication.scheduledTime}
                </Text>
                <Text style={styles.medicationDetails}>
                  Dosage: {selectedMedication.dosage} pill(s)
                </Text>
                
                {selectedMedication.isPast && (
                  <Text style={styles.lateNotice}>
                    ⏰ This medication is late. Please confirm if you took it.
                  </Text>
                )}
                
                <Text style={styles.confirmQuestion}>
                  Did you take this medication?
                </Text>
              </View>
              
              <View style={styles.modalActions}>
                <TouchableOpacity 
                  style={[styles.actionBtn, styles.notTakenBtn]}
                  onPress={() => confirmMedicationTaken(selectedMedication, false)}
                >
                  <Text style={styles.actionBtnText}>No, I skipped it</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.actionBtn, styles.takenBtn]}
                  onPress={() => confirmMedicationTaken(selectedMedication, true)}
                >
                  <Text style={styles.actionBtnText}>Yes, I took it</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Add Medication Modal */}
      <Modal
        visible={addModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Medication</Text>
              <TouchableOpacity onPress={() => setAddModal(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalContent}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Medication Name</Text>
                <TextInput
                  style={styles.textInput}
                  value={newMedication.title}
                  onChangeText={(text) => setNewMedication({...newMedication, title: text})}
                  placeholder="Enter medication name"
                  placeholderTextColor="#999"
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Time (HH:MM)</Text>
                <TextInput
                  style={styles.textInput}
                  value={newMedication.time}
                  onChangeText={(text) => setNewMedication({...newMedication, time: text})}
                  placeholder="e.g., 08:00"
                  placeholderTextColor="#999"
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Dosage</Text>
                <TextInput
                  style={styles.textInput}
                  value={newMedication.dosage}
                  onChangeText={(text) => setNewMedication({...newMedication, dosage: text})}
                  placeholder="e.g., 1 pill"
                  placeholderTextColor="#999"
                />
              </View>
            </View>
            
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.actionBtn, styles.cancelBtn]}
                onPress={() => setAddModal(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionBtn, styles.addBtn]}
                onPress={addMedication}
              >
                <Text style={styles.actionBtnText}>Add Medication</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Toast Notification */}
      {toast.visible && (
        <View style={[styles.toast, toast.type === 'success' ? styles.toastSuccess : styles.toastWarning]}>
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
  modalOverlay: {
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