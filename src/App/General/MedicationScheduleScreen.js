import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Modal, 
  TextInput,
  ScrollView,
  Alert,
  Platform,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import MedicationService from '../../services/MedicationService';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

const MedicationScheduleScreen = ({ navigation }) => {
  const [medications, setMedications] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentScheduleId, setCurrentScheduleId] = useState(null);
  
  const [medicationData, setMedicationData] = useState({
    name: '',
    dosage: '',
    date: new Date(),
    time: new Date(),
    frequency: 'once'
  });
  
  useEffect(() => {
    loadMedications();
  }, []);
  
  const loadMedications = async () => {
    try {
      setIsLoading(true);
      const data = await MedicationService.getUserMedicationSchedules();
      setMedications(data);
    } catch (error) {
      Alert.alert('Error', 'Failed to load medications');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleAddMedication = async () => {
    if (!medicationData.name) {
      Alert.alert('Error', 'Please enter a medication name');
      return;
    }
    
    try {
      setIsLoading(true);
      
      if (isEditing && currentScheduleId) {
        await MedicationService.updateMedicationSchedule(currentScheduleId, {
          name: medicationData.name,
          dosage: medicationData.dosage,
          date: medicationData.date.toISOString().split('T')[0],
          time: medicationData.time.toLocaleTimeString('en-US', { hour12: false }),
          frequency: medicationData.frequency
        });
        
        Alert.alert('Success', 'Medication updated successfully');
      } else {
        await MedicationService.addMedicationSchedule({
          name: medicationData.name,
          dosage: medicationData.dosage,
          date: medicationData.date.toISOString().split('T')[0],
          time: medicationData.time.toLocaleTimeString('en-US', { hour12: false }),
          frequency: medicationData.frequency
        });
        
        Alert.alert('Success', 'Medication added successfully');
      }
      
      resetForm();
      setShowModal(false);
      loadMedications();
    } catch (error) {
      Alert.alert('Error', `Failed to ${isEditing ? 'update' : 'add'} medication`);
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleEdit = (medication) => {
    setIsEditing(true);
    setCurrentScheduleId(medication.id);
    
    const scheduledDate = new Date(medication.scheduled_date);
    const timeArray = medication.scheduled_time.split(':');
    const scheduledTime = new Date();
    scheduledTime.setHours(parseInt(timeArray[0], 10));
    scheduledTime.setMinutes(parseInt(timeArray[1], 10));
    
    setMedicationData({
      name: medication.medication_name,
      dosage: medication.dosage || '',
      date: scheduledDate,
      time: scheduledTime,
      frequency: medication.frequency || 'once'
    });
    
    setShowModal(true);
  };
  
  const handleDelete = async (scheduleId) => {
    try {
      setIsLoading(true);
      await MedicationService.deleteMedicationSchedule(scheduleId);
      Alert.alert('Success', 'Medication removed successfully');
      loadMedications();
    } catch (error) {
      Alert.alert('Error', 'Failed to delete medication');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const confirmDelete = (scheduleId) => {
    Alert.alert(
      'Confirm Deletion',
      'Are you sure you want to delete this medication schedule?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => handleDelete(scheduleId) }
      ]
    );
  };
  
  const resetForm = () => {
    setMedicationData({
      name: '',
      dosage: '',
      date: new Date(),
      time: new Date(),
      frequency: 'once'
    });
    setIsEditing(false);
    setCurrentScheduleId(null);
  };
  
  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (event?.type === 'dismissed') {
      return;
    }
    if (selectedDate) {
      setMedicationData({...medicationData, date: selectedDate});
    }
  };
  
  const handleTimeChange = (event, selectedTime) => {
    setShowTimePicker(false);
    if (event?.type === 'dismissed') {
      return;
    }
    if (selectedTime) {
      setMedicationData({...medicationData, time: selectedTime});
    }
  };

  const getFrequencyColor = (frequency) => {
    switch (frequency) {
      case 'daily': return ['#FF6B6B', '#FF8E8E'];
      case 'weekly': return ['#4ECDC4', '#6CE5DB'];
      default: return ['#A8E6CF', '#C8F2E0'];
    }
  };

  const getMedicationIcon = (name) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('vitamin') || lowerName.includes('supplement')) return 'nutrition';
    if (lowerName.includes('pain') || lowerName.includes('relief')) return 'bandage';
    if (lowerName.includes('heart') || lowerName.includes('blood')) return 'heart';
    return 'medical';
  };
  
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>My Medications</Text>
            <Text style={styles.headerSubtitle}>{medications.length} scheduled</Text>
          </View>
          <View style={styles.headerStats}>
            <Ionicons name="medical" size={24} color="#fff" />
          </View>
        </View>
      </LinearGradient>
      
      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={styles.medicationList}
        showsVerticalScrollIndicator={false}
      >
        {medications.length === 0 ? (
          <View style={styles.emptyState}>
            <LinearGradient
              colors={['#f093fb', '#f5576c']}
              style={styles.emptyIconContainer}
            >
              <Ionicons name="medical-outline" size={50} color="#fff" />
            </LinearGradient>
            <Text style={styles.emptyText}>No medications yet</Text>
            <Text style={styles.emptySubText}>Start managing your health by adding your first medication</Text>
          </View>
        ) : (
          medications.map((med, index) => (
            <LinearGradient
              key={med.id}
              colors={['#ffffff', '#f8f9ff']}
              style={[styles.medicationCard, { marginTop: index === 0 ? 0 : 16 }]}
            >
              <View style={styles.medicationHeader}>
                <View style={styles.medicationIconContainer}>
                  <LinearGradient
                    colors={getFrequencyColor(med.frequency)}
                    style={styles.medicationIconGradient}
                  >
                    <Ionicons 
                      name={getMedicationIcon(med.medication_name)} 
                      size={24} 
                      color="#fff" 
                    />
                  </LinearGradient>
                </View>
                <View style={styles.medicationMainInfo}>
                  <Text style={styles.medicationName}>{med.medication_name}</Text>
                  {med.dosage && (
                    <View style={styles.dosageContainer}>
                      <Ionicons name="water" size={14} color="#9966CC" />
                      <Text style={styles.medicationDosage}>{med.dosage}</Text>
                    </View>
                  )}
                </View>
                <View style={styles.medicationActions}>
                  <TouchableOpacity 
                    style={styles.editButton}
                    onPress={() => handleEdit(med)}
                  >
                    <Ionicons name="create-outline" size={18} color="#667eea" />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.deleteButton}
                    onPress={() => confirmDelete(med.id)}
                  >
                    <Ionicons name="trash-outline" size={18} color="#ff6b6b" />
                  </TouchableOpacity>
                </View>
              </View>
              
              <View style={styles.medicationDetails}>
                <View style={styles.scheduleInfo}>
                  <View style={styles.scheduleItem}>
                    <Ionicons name="calendar" size={16} color="#667eea" />
                    <Text style={styles.scheduleText}>
                      {new Date(med.scheduled_date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric'
                      })}
                    </Text>
                  </View>
                  <View style={styles.scheduleItem}>
                    <Ionicons name="time" size={16} color="#667eea" />
                    <Text style={styles.scheduleText}>
                      {med.scheduled_time.substring(0, 5)}
                    </Text>
                  </View>
                  {med.frequency !== 'once' && (
                    <View style={styles.frequencyBadge}>
                      <Text style={styles.frequencyBadgeText}>
                        {med.frequency.toUpperCase()}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </LinearGradient>
          ))
        )}
      </ScrollView>
      
      <TouchableOpacity 
        style={styles.fabContainer}
        onPress={() => {
          resetForm();
          setShowModal(true);
        }}
      >
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          style={styles.fab}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>
      
      <Modal
        visible={showModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <LinearGradient
              colors={['#667eea', '#764ba2']}
              style={styles.modalHeader}
            >
              <Text style={styles.modalTitle}>
                {isEditing ? 'Edit Medication' : 'Add New Medication'}
              </Text>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setShowModal(false)}
              >
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </LinearGradient>
            
            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  <Ionicons name="medical" size={16} color="#667eea" /> Medication Name
                </Text>
                <TextInput 
                  style={styles.input}
                  value={medicationData.name}
                  onChangeText={(text) => setMedicationData({...medicationData, name: text})}
                  placeholder="Enter medication name"
                  placeholderTextColor="#a0a0a0"
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  <Ionicons name="water" size={16} color="#667eea" /> Dosage (Optional)
                </Text>
                <TextInput 
                  style={styles.input}
                  value={medicationData.dosage}
                  onChangeText={(text) => setMedicationData({...medicationData, dosage: text})}
                  placeholder="E.g., 1 pill, 5ml, 100mg"
                  placeholderTextColor="#a0a0a0"
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  <Ionicons name="calendar" size={16} color="#667eea" /> Date
                </Text>
                <TouchableOpacity 
                  style={styles.dateTimeButton}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text style={styles.dateTimeText}>
                    {medicationData.date.toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </Text>
                  <LinearGradient
                    colors={['#667eea', '#764ba2']}
                    style={styles.dateTimeIcon}
                  >
                    <Ionicons name="calendar" size={18} color="#fff" />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  <Ionicons name="time" size={16} color="#667eea" /> Time
                </Text>
                <TouchableOpacity 
                  style={styles.dateTimeButton}
                  onPress={() => setShowTimePicker(true)}
                >
                  <Text style={styles.dateTimeText}>
                    {medicationData.time.toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true
                    })}
                  </Text>
                  <LinearGradient
                    colors={['#667eea', '#764ba2']}
                    style={styles.dateTimeIcon}
                  >
                    <Ionicons name="time" size={18} color="#fff" />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  <Ionicons name="repeat" size={16} color="#667eea" /> Frequency
                </Text>
                <View style={styles.frequencyGrid}>
                  {[
                    { key: 'once', label: 'Once', icon: 'radio-button-on', colors: ['#A8E6CF', '#C8F2E0'] },
                    { key: 'daily', label: 'Daily', icon: 'sunny', colors: ['#FF6B6B', '#FF8E8E'] },
                    { key: 'weekly', label: 'Weekly', icon: 'calendar', colors: ['#4ECDC4', '#6CE5DB'] }
                  ].map((freq) => (
                    <TouchableOpacity 
                      key={freq.key}
                      style={[
                        styles.frequencyCard,
                        medicationData.frequency === freq.key && styles.selectedFrequencyCard
                      ]}
                      onPress={() => setMedicationData({...medicationData, frequency: freq.key})}
                    >
                      <LinearGradient
                        colors={medicationData.frequency === freq.key ? ['#667eea', '#764ba2'] : freq.colors}
                        style={styles.frequencyIconContainer}
                      >
                        <Ionicons 
                          name={freq.icon} 
                          size={20} 
                          color="#fff" 
                        />
                      </LinearGradient>
                      <Text style={[
                        styles.frequencyText,
                        medicationData.frequency === freq.key && styles.selectedFrequencyText
                      ]}>
                        {freq.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>
            
            <TouchableOpacity 
              style={[styles.saveButtonContainer, isLoading && styles.disabledButton]}
              onPress={handleAddMedication}
              disabled={isLoading}
            >
              <LinearGradient
                colors={isLoading ? ['#cccccc', '#bbbbbb'] : ['#667eea', '#764ba2']}
                style={styles.saveButton}
              >
                <Text style={styles.saveButtonText}>
                  {isLoading ? 'Saving...' : isEditing ? 'Update Medication' : 'Save Medication'}
                </Text>
                {!isLoading && (
                  <Ionicons name="checkmark" size={20} color="#fff" />
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      
      {showDatePicker && (
        <DateTimePicker
          value={medicationData.date}
          mode="date"
          display="default"
          onChange={handleDateChange}
        />
      )}
      
      {showTimePicker && (
        <DateTimePicker
          value={medicationData.time}
          mode="time"
          is24Hour={false}
          display="default"
          onChange={handleTimeChange}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  headerStats: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContainer: {
    flex: 1,
  },
  medicationList: {
    padding: 20,
    paddingBottom: 100,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 80,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubText: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
    lineHeight: 24,
  },
  medicationCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(102, 126, 234, 0.1)',
  },
  medicationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  medicationIconContainer: {
    marginRight: 16,
  },
  medicationIconGradient: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  medicationMainInfo: {
    flex: 1,
  },
  medicationName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  dosageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  medicationDosage: {
    fontSize: 14,
    color: '#9966CC',
    marginLeft: 4,
    fontWeight: '600',
  },
  medicationActions: {
    flexDirection: 'row',
  },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  medicationDetails: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(102, 126, 234, 0.1)',
    paddingTop: 16,
  },
  scheduleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  scheduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
    marginBottom: 4,
  },
  scheduleText: {
    fontSize: 14,
    color: '#5a6c7d',
    marginLeft: 6,
    fontWeight: '500',
  },
  frequencyBadge: {
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 'auto',
  },
  frequencyBadgeText: {
    fontSize: 12,
    color: '#667eea',
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  fabContainer: {
    position: 'absolute',
    right: 20,
    bottom: 30,
  },
  fab: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    maxHeight: height * 0.9,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 0.5,
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    padding: 24,
    maxHeight: height * 0.6,
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  input: {
    backgroundColor: '#f8f9ff',
    borderWidth: 2,
    borderColor: 'rgba(102, 126, 234, 0.1)',
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    color: '#2c3e50',
    fontWeight: '500',
  },
  dateTimeButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8f9ff',
    borderWidth: 2,
    borderColor: 'rgba(102, 126, 234, 0.1)',
    borderRadius: 16,
    padding: 16,
  },
  dateTimeText: {
    fontSize: 16,
    color: '#2c3e50',
    fontWeight: '500',
  },
  dateTimeIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  frequencyGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  frequencyCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#f8f9ff',
    borderWidth: 2,
    borderColor: 'rgba(102, 126, 234, 0.1)',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 4,
  },
  selectedFrequencyCard: {
    borderColor: '#667eea',
    backgroundColor: 'rgba(102, 126, 234, 0.05)',
  },
  frequencyIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  frequencyText: {
    fontSize: 14,
    color: '#5a6c7d',
    fontWeight: '600',
    textAlign: 'center',
  },
  selectedFrequencyText: {
    color: '#667eea',
    fontWeight: 'bold',
  },
  saveButtonContainer: {
    margin: 24,
    marginTop: 0,
  },
  saveButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 18,
    borderRadius: 16,
  },
  disabledButton: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 8,
    letterSpacing: 0.5,
  },
});

export default MedicationScheduleScreen; 